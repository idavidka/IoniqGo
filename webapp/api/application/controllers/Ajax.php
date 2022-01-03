<?php
defined('BASEPATH') or exit('No direct script access allowed');

define('DISABLE_AUTHORIZATION', true);

class Ajax extends CI_Controller
{

	private $data = array(
		'status' => null,
		'statusText' => '',
	);

	private $enabledTokenType = array('Bearer');

	private $backupDir = '../backups/';

	public function __construct()
	{
		$this->cors();

		parent::__construct();
		$this->requestTime = $this->input->get('ts', '0');
		$this->requestType = $this->router->fetch_method();
		$this->data['userAgent'] = $this->userAgent = $this->input->get('User-Agent', isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '');

		$this->load->database();

		$this->data['requestUri'] = $_SERVER['REQUEST_URI'];

		if (!in_array($this->requestType, array('auth'))) {
			$this->doAuth();
		}
	}

	private function getDate($date)
	{
		$date = date_parse_from_format("y/m/d H:i:s", $date);

		return $date['year'] . '-'
			. leading_zero($date['month'], 2) . '-'
			. leading_zero($date['day'], 2) . ' '
			. leading_zero($date['hour'], 2) . ':'
			. leading_zero($date['minute'], 2) . ':'
			. leading_zero($date['second'], 2);
	}

	private function getPulls($runnerId)
	{
		return $this->db->get_where('ioniqgo_pulls', array('runner_id' => $runnerId))->result_array();
	}

	private function getLastPullData($runnerId)
	{
		$pull = $this->db->get_where('ioniqgo_pulls', array('runner_id' => $runnerId))->row_array();

		if ($pull) {
			$lastTime = $this->db->select('time')->order_by('time', 'DESC')->get_where('ioniqgo_pull_savings', array('pull_id' => $pull['id']), 1)->row_array();
			if ($lastTime) {
				return $this->db->order_by('id')->get_where('ioniqgo_pull_savings', array('pull_id' => $pull['id'], 'time' => $lastTime['time']))->result_array();
			}
		}

		return null;
	}

	private  function getLastPullDataAsResponse($runnerId)
	{
		$lastData = $this->getLastPullData($runnerId);

		$response = array();
		if ($lastData) {
			if (isset($lastData[0]['time'])) {
				$response['time'] = $lastData[0]['time'];
			}
			foreach ($lastData as $key => $datum) {
				$template = $this->getTemplate($runnerId, $datum['template_id']);

				if ($template) {
					$response[$template['key']] = $datum['value'];
				}
			}
			return $response;
		}

		return null;
	}

	public function pull($runner_id)
	{
		$savings = $this->input->get('save', array());

		if (!isset($savings['field'])) {
			$this->error(400, 'Bad request', __LINE__);
		}
		$pulls = $this->getPulls($runner_id);

		if (!$pulls) {
			$this->error404(__LINE__);
		}

		$templates = array();

		foreach ($pulls as $pull) {
			foreach (explode(',', $pull['template_id']) as $templateId) {
				$template = $this->getTemplate($runner_id, $templateId);

				if ($template) {
					$keys = explode(",", $template['key']);
					foreach ($keys as $key) {
						$templates[$key] = array_merge($template, array('pull_id' => $pull['id']));
					}
				}
			}
		}

		// $this->data['pulls'] = $pulls;
		// $this->data['template'] = $templates;

		$this->data['data'] = $savings['field'];
		$time = isset($savings['time']) ? $this->getDate($savings['time']) : date('Y-m-d H:i:s');
		$savedTemp = array();
		foreach ($savings['field'] as $field => $value) {

			if (isset($templates[$field])) {
				$template = $templates[$field];
				$keys = explode(",", $template['key']);

				if (!isset($savedTemp[$template['key']])) {
					$savedTemp[$template['key']] = array(
						'keys' => $keys,
						'values' => array(),
						'pull_id' => $template['pull_id'],
						'template_id' => $template['id'],
						'time' => $time, 'value' => $value,
						'formatter' => $template['formatter'],
						'formatterParams' => $template['formatterParams'],
						'hiddenChart' => $template['hiddenChart']
					);
				}

				$savedTemp[$template['key']]['values'][] = $value;
			}
		}
		$saved = array();
		foreach ($savedTemp as $savedRow) {
			if (count($savedRow['keys']) === count($savedRow['values'])) {
				$savedRow['value'] = implode(',', $savedRow['values']);
				unset($savedRow['keys'], $savedRow['values']);
				$saved[] = $savedRow;
			}
		}

		$this->data['savings']  = $saved;
		$this->data['saved'] = $this->db->insert_batch('ioniqgo_pull_savings', $saved);

		$this->index();
	}

	public function cors()
	{
		header('Access-Control-Allow-Origin: *');
		header('Access-Control-Allow-Headers: Authorization, Origin, X-Requested-With, Content-Type, Accept');
		header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

		if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
			if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
				header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
			}

			if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
				header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
			}

			exit(0);
		}
	}

	public function error($code, $text, $line)
	{
		$this->setStatus($code, $text, $line);
		$this->index();
		$this->output->_display();
		die();
	}

	public function error404($line = __LINE__)
	{
		$this->error(404, 'Not found', $line);
	}

	public function index()
	{
		$this->data['status'] = (int)(!!$this->data['status'] ? $this->data['status'] : 200);
		$this->data['statusText'] = !!$this->data['statusText'] ? $this->data['statusText'] : 'OK';
		$this->output
			->set_content_type('application/json')
			->set_output(json_encode($this->data))
			->set_status_header($this->data['status'], $this->data['statusText']);
	}

	private function getUrls($id)
	{
		return $this->db->order_by('step')->get_where('ioniqgo_runner_urls', array('runner_id' => $id))->result_array();
	}

	private function getTemplate($runnerId, $templateId = null)
	{
		$this->db->select('hrt.*, hr.key AS runner_key');
		$this->db->join('ioniqgo_runners_x_templates AS hrxt', 'hrxt.template_id = hrt.id');
		$this->db->join('ioniqgo_runners AS hr', 'hrxt.runner_id = hr.id');
		$this->db->from('ioniqgo_runner_templates AS hrt');
		if ($templateId) {
			$this->db->where('hrxt.template_id',  $templateId);
		}
		$this->db->where('hrxt.runner_id',  $runnerId);
		$this->db->order_by('hrt.order');
		return $this->db->get()->row_array();
	}

	private function getGroupName($id)
	{
		$group = $this->db->select('name')->get_where('ioniqgo_runner_groups', array('id' => $id))->row_array();

		if ($group) {
			return $group['name'];
		}

		return null;
	}

	private function getTemplates($id)
	{
		$this->db->select('hrt.*');
		$this->db->join('ioniqgo_runners_x_templates AS hrxt', 'hrxt.template_id = hrt.id');
		$this->db->from('ioniqgo_runner_templates AS hrt');
		$this->db->where('hrxt.runner_id',  $id);
		$this->db->order_by('hrt.order');
		return $this->db->get()->result_array();
	}

	private function getParams($params)
	{
		$output = $params;
		try {
			$output = json_decode($params, true);
		} catch (Exception $err) {
		}

		if (!is_array($output)) {
			parse_str($params, $output);
		}

		return $output;
	}

	private function getNext()
	{
		$post = json_decode($this->input->raw_input_stream, true);

		if (isset($post['next']) && is_array($post['next']) && count($post['next']) > 0) {
			$id = key($post['next']);
			return array('id' => $id, 'token' => $post['next'][$id]);
		}

		return null;
	}

	private function isAsync()
	{
		$post = json_decode($this->input->raw_input_stream, true);
		$async = $this->input->get_post('async', false);

		return (isset($post['async']) && (bool)$post['async']) || (bool)$async;
	}

	public function onDemand($key, $onDemandKey)
	{
		$this->setStatus(200, 'OK', __LINE__);

		$runner = $this->getRunnerByKey($key);
		$onDemand = $this->getRunnerByKey($onDemandKey);


		if ($runner['on_demand_runner_id'] && $runner['on_demand_template_id'] && $runner['on_demand_runner_id'] === $onDemand['id']) {
			$this->runner($onDemand['key'], null, true);
		} else {
			$this->error(500, 'No on demand', __LINE__);
		}

		$this->index();
	}

	public function runner($key, $passedCommand = null, $isOnDemand = false)
	{
		$this->setStatus(200, 'OK', __LINE__);
		$delay = $this->input->get('delay', false);
		$isUpdate = $this->input->get('update', '0') == '1';
		$prevDataCount = $this->input->get('count', '0');
		$periodicalCounter = $this->input->get('periodicalCounter', '0');

		$command = $passedCommand ? $passedCommand : $this->getRunnerByKey($key);

		$nextUrl = $this->getNext();

		if (!$command || !$command['urls']) {
			if ($passedCommand) {
				return null;
			} else {
				$this->error404(__LINE__);
			}
		}

		set_time_limit(600);
		if ($delay) {
			sleep((int)$delay);
		}

		$data = array();
		$data['runner'] = &$command;
		$data['responses'] = array();
		$data['next'] = null;

		if ($isUpdate) {
			$this->getChartData($data['runner'], $prevDataCount);
		}

		$token = null;
		$startedFromNext = false;
		foreach ($command['urls'] as &$url) {
			if ($nextUrl && $url['id'] == $nextUrl['id']) {
				$startedFromNext = true;
				$token = $nextUrl['token'];
			}
			if ($nextUrl && !$startedFromNext) {
				continue;
			}
			if ($url['delay'] > 0) {
				if ($this->isAsync() && (!$nextUrl || $nextUrl['id'] != $url['id'])) {
					$data['next'] = array(
						$url['id'] => $token,
					);
					break;
				} else {
					sleep($url['delay']);
				}
			}
			$url['params'] = $this->getParams($url['params']);
			list($username, $password) = $url['basicAuth'] ? explode(':', $url['basicAuth']) : array(false, false);

			unset($url['basicAuth']);

			$headers = array();

			if ($token) {
				$headers[] = 'Authorization: Bearer ' . $token;
			}

			$response = null;

			if ($isOnDemand) {
				$url['url'] .= (stristr($url['url'], '?') ? '&' : '?') . 'ondemand=1';
			}

			if ($url['url'] == 'self://last-pull') {
				$response = array('body' => array_merge(array('status' => 200, 'statusText' => 'OK'), $this->getLastPullDataAsResponse($command['id'])));
			} elseif ($url['method'] == 'post') {
				$response = $this->postContents($url['url'], $url['params'], 60, $headers, true, $username, $password);
			} else {
				$response = $this->getContents($url['url'], 60, $headers, true, $username, $password);
			}

			$data['responses'][$url['url']] = $response;

			$statusCode = 200;
			$statusText = 'OK';
			if ((!$response['body'] || !isset($response['body']['status'])) && isset($response['headers']['status'])) {
				$statusCode = $response['headers']['status'];
				$statusText = $response['headers']['statusText'];
			} else if (isset($response['body']['status'])) {
				$statusCode = $response['body']['status'];
				$statusText = $response['body']['statusText'];
			} else if ($response['body'] == null) {
				$statusCode = 504;
				$statusText = 'Request timeout';
			}

			if (!$passedCommand) {
				$this->setStatus($statusCode, $statusText, __LINE__);
			}

			if ((int)$statusCode !== 200) {
				break;
			}

			if ($url['stopOnKey']) {
				$stopOnValue = get_item($response['body'], $url['stopOnKey']);


				$shouldStop = false;
				if ($url['stopOnValue'] === '') {
					$shouldStop = !!$stopOnValue;
				} else {
					$shouldStop = $url['stopOnValue'] == $stopOnValue;
				}

				if ($shouldStop) {
					$this->data['responses'][$url['url']]['body']['hasBeenStopped'] = true;

					if ($url['stopWithError']) {
						$statusCode = 417;
						$statusText = 'Expectation failed';
					}
					if ($url['stopOnMessage']) {
						$statusText = $url['stopOnMessage'];
					}
					if (!$passedCommand) {
						$this->setStatus($statusCode, $statusText, __LINE__);
					}
					break;
				}
			}

			if (isset($response['body']['token'])) {
				$token = $response['body']['token'];
			}
		}

		unset($command['urls'], $command['templates'], $command['on_demand_runner_id'], $command['on_demand_template_id'], $command['on_demand_template_id']);

		$this->data = array_merge($this->data, $data);

		if (!$passedCommand) {
			$this->index();
		} else {
			return $data['responses'];
		}
	}

	private function getUser($username, $password)
	{
		return $this->db->get_where('ioniqgo_runner_admin', array('username' => $username, 'password' => $password))->row_array();
	}

	private function getUserByToken($token)
	{
		$this->db->select('hra.*, hrat.token');
		$this->db->join('ioniqgo_runner_admin AS hra', 'hrat.admin_id = hra.id');
		$this->db->from('ioniqgo_runner_admin_tokens AS hrat');
		$this->db->where('hrat.token',  $token);
		return $this->db->get()->result_array();
		// return $this->db->get_where('ioniqgo_runner_admin', array('token' => $token))->row_array();
	}

	private function getRunnerByKey($key)
	{
		$command = $this->db->get_where('ioniqgo_runners', array('key' => $key), 1, 0)->row_array();

		if ($command) {
			$command['urls'] = $this->getUrls($command['id']);
			$command['templates'] = $this->getTemplates($command['id']);
		}

		return $command;
	}

	private function getRunnerById($id)
	{
		$command = $this->db->get_where('ioniqgo_runners', array('id' => $id), 1, 0)->row_array();

		if ($command) {
			$command['urls'] = $this->getUrls($command['id']);
			$command['templates'] = $this->getTemplates($command['id']);
		}

		return $command;
	}

	private function getChart($id, $table = 'cron')
	{
		// 
		$query = $this->db->select('hcs.*, hc.runner_id, IF(`hcs`.`time` > NOW() - INTERVAL 24 HOUR, 1, 0) as `today`')
			->from('ioniqgo_' . $table . 's hc')
			->join('ioniqgo_' . $table . '_savings hcs', 'hcs.' . $table . '_id = hc.id')
			->where('hiddenChart', false);
		if ($table == 'cron') {
			$query->where('`time` > (NOW() - INTERVAL 24 HOUR)');
		}
		return $query->where('hc.runner_id', $id)
			->order_by($table . '_id, time, template_id')
			->get()
			->result_array();
	}

	private function getChartMax($id, $table = 'cron')
	{
		$max = $this->db->select('hcs.*, hc.runner_id, MAX(hcs.value) as `value`')
			->from('ioniqgo_' . $table . 's hc')
			->join('ioniqgo_' . $table . '_savings hcs', 'hcs.' . $table . '_id = hc.id')
			->where('hiddenChart', false)
			->where('hc.runner_id', $id)
			->group_by('hcs.template_id')
			->order_by('' . $table . '_id, time')->get()
			->result_array();

		return $max;
	}

	private function getChartMin($id, $table = 'cron')
	{
		$max = $this->db->select('hcs.*, hc.runner_id, MIN(hcs.value) as `value`')
			->from('ioniqgo_' . $table . 's hc')
			->join('ioniqgo_' . $table . '_savings hcs', 'hcs.' . $table . '_id = hc.id')
			->where('hiddenChart', false)
			->where('hc.runner_id', $id)
			->group_by('hcs.template_id')
			->order_by('' . $table . '_id, time')
			->get()
			->result_array();

		return $max;
	}

	private function getChartData(&$runner, $prevDataCount = false)
	{
		$data = array_merge($this->getChart($runner['id']), $this->getChart($runner['id'], 'pull'));

		if ($prevDataCount === false || count($data) != $prevDataCount) {

			$runner['data'] = $data;
			$runner['dataMax'] = $this->getChartMax($runner['id']);
			$runner['dataMin'] = $this->getChartMin($runner['id']);
			$runner['dataMaxPull'] = $this->getChartMax($runner['id'], 'pull');
			$runner['dataMinPull'] = $this->getChartMin($runner['id'], 'pull');

			if ($runner['dataMax'] < $runner['dataMaxPull']) {
				$runner['dataMax'] = $runner['dataMaxPull'];
			}
			if ($runner['dataMin'] > $runner['dataMinPull']) {
				$runner['dataMin'] = $runner['dataMinPull'];
			}
		}
	}

	private function getRunners($containsUrls = false)
	{
		$runners = $this->db->select('* , IF( `group` IS NULL , `order`, `group` ) AS grouping')->order_by('grouping, order, id')->get('ioniqgo_runners')->result_array();

		foreach ($runners as &$runner) {
			$runner['templates'] = $this->getTemplates($runner['id']);
			$runner['groupName'] = $this->getGroupName($runner['group']);
			$runner['onDemand'] = null;
			if ($runner['on_demand_runner_id'] && $runner['on_demand_template_id']) {
				$runner['onDemand'] = array();
				foreach (explode(',', $runner['on_demand_template_id']) as $onDemandTemplateId) {
					$onDemand = $this->getTemplate($runner['on_demand_runner_id'], $onDemandTemplateId);
					if ($onDemand) {
						$key = $onDemand['runner_key'];
						unset($onDemand['runner_key'], $onDemand['parent_id'], $onDemand['id'], $onDemand['order']);

						if (!isset($runner['onDemand']['templates'])) {
							$runner['onDemand']['templates'] = array();
						}

						$runner['onDemand']['delay'] = $runner['on_demand_delay'];
						$runner['onDemand']['runner_key'] = $key;
						$runner['onDemand']['templates'][] = $onDemand;
					}
				}
			}
			if ($containsUrls) {
				$runner['urls'] = $this->getUrls($runner['id']);
			}

			$this->getChartData($runner);

			unset($runner['on_demand_runner_id'], $runner['on_demand_template_id'], $runner['on_demand_delay']);
		}

		return $runners;
	}

	private function getApps()
	{
		return $this->db->order_by('order,id')->get('ioniqgo_apps')->result_array();
	}

	protected function getAuthorizationToken()
	{

		$token = $this->input->get_request_header('Authorization');

		if (!$token) {
			$token = $this->input->get_post('token', '');
			$tokenType = $this->input->get_post('type', '');
			$token = $token && $tokenType  ? $tokenType . ' ' . $token : $this->input->get_post('Authorization', '');
		}

		if ($token) {
			preg_match('/^(?<type>[^\s]+)\s+(?<token>.+)$/', $token, $parsed);
			if (in_array($parsed['type'], $this->enabledTokenType)) {
				return $parsed['token'];
			}
		}

		return null;
	}

	protected function doAuth()
	{
		if (DISABLE_AUTHORIZATION) {
			return;
		}

		$token = $this->getAuthorizationToken();
		$user = null;
		if ($token) {
			$user = $this->getUserByToken($token);
		}

		// $username = $this->input->get('username', null);
		// $key = $this->input->get('key', null);

		// if(!$user && $username && $key) {
		// 	$user = $this->getUser($username, sha1($key));
		// } 

		if (!$user) {
			$this->error(401, 'Unauthorized', __LINE__);
		}
	}

	public function auth()
	{
		$this->setStatus(200, 'OK', __LINE__);

		if (DISABLE_AUTHORIZATION) {
			$this->data['token'] = 'access_all';
		} else {

			$post = json_decode($this->input->raw_input_stream, true);

			$user = null;

			if (isset($post['username']) && isset($post['key'])) {
				$user = $this->getUser($post['username'], $post['key']);
			}

			if (!$user) {
				$this->error(401, 'Unauthorized', __LINE__);
			}

			$tokenData = array(
				'username' => $user['username'],
				'refreshed' => true,
				'issued' => time(),
				'expires' => (time() + 1800)
			);
			$newToken = Jwt::encode($tokenData, $this->config->item('encryption_key'));


			$this->data['token'] = $newToken;
			$this->db->insert('ioniqgo_runner_admin_tokens', array('admin_id' => $user['id'], 'token' => $newToken));
			$this->db->set(array('token' => $newToken));
			$this->db->where('id', $user['id']);
			$this->db->update('ioniqgo_runner_admin');
		}

		$this->index();
	}

	private function parseValue($value, $key)
	{
		$current = date($key, time());
		// print $key.': '.$value.' = '.$current.'<br>';

		if ($current == $value || $value == '*') {
			return true;
		}

		preg_match('/\*\/(\d+)/', $value, $matchDim);
		if ($matchDim && isset($matchDim[1]) && $current % $matchDim[1] === 0) {
			return true;
		}


		preg_match('/(\d+)\-(\d+)/', $value, $matchRange);
		if ($matchRange && isset($matchRange[1])  && isset($matchRange[2]) && $current >= $matchRange[1] && $current <= $matchRange[2]) {
			return true;
		}

		return false;
	}

	private function parsemin($value)
	{
		return $this->parseValue($value, 'i');
	}

	private function parsehour($value)
	{
		return $this->parseValue($value, 'G');
	}

	private function parsedom($value)
	{
		return $this->parseValue($value, 'j');
	}

	private function parsemon($value)
	{
		return $this->parseValue($value, 'n');
	}

	private function parsedow($value)
	{
		return $this->parseValue($value, 'w');
	}

	private function parseTick($values, $type, $debug = false)
	{
		$value = preg_replace('/[^0-9\/\*\-\,]/', '', $values[$type]);

		$values = array_flip(explode(',', $value));

		foreach ($values as $key => &$val) {
			$method = 'parse' . $type;
			$val = $this->$method($key);

			if (!$debug && $val) {
				return true;
			}
		}

		return $debug ? $values : false;
	}

	private function canRun($cron)
	{
		return $this->parseTick($cron, 'min') && $this->parseTick($cron, 'hour') && $this->parseTick($cron, 'dom') && $this->parseTick($cron, 'mon') && $this->parseTick($cron, 'dow');
	}

	private function getCrons()
	{
		$crons = array();

		$query = $this->db->get('ioniqgo_crons');
		while ($cron = $query->unbuffered_row('array')) {
			$cronDebug = array(
				'min' => $this->parseTick($cron, 'min', true),
				'hour' => $this->parseTick($cron, 'hour', true),
				'dom' => $this->parseTick($cron, 'dom', true),
				'mon' => $this->parseTick($cron, 'mon', true),
				'dow' => $this->parseTick($cron, 'dow', true)
			);
			$newCron = array_merge($cron, $cronDebug, array(
				'canRun' => $this->canRun($cron)
			));

			$crons[] = $newCron;
		}

		return $crons;
	}

	public function cron()
	{
		$this->setStatus(200, 'OK', __LINE__);

		$this->data['crons'] = $this->getCrons();

		foreach ($this->data['crons'] as &$cron) {
			if (!$cron['canRun']) {
				continue;
			}

			$runner = $this->getRunnerById($cron['runner_id']);

			if ($runner) {
				$cron['runner'] = $runner;
				$cron['templates'] = array();

				$cron['responses'] = $this->runner(null, $runner);

				if ($cron['template_id']) {
					foreach (explode(',', $cron['template_id']) as $templateId) {
						$template = $this->getTemplate($cron['runner_id'], $templateId);

						if ($template && $template['key']) {
							$lastResponse = end($cron['responses']);
							$cron['savedField'] = stripos($template['key'], '@responses.') === 0
								? get_item(array_values($cron['responses']), str_ireplace('@responses.', '', $template['key']))
								: get_item($lastResponse['body'], $template['key']);

							$this->db->insert('ioniqgo_cron_savings', array(
								'time' => date('Y-m-d H:i:s'),
								'cron_id' => $cron['id'],
								'template_id' => $templateId,
								'value' => $cron['savedField'] ? $cron['savedField'] : 0,
								'formatter' => $template['formatter'],
								'formatterParams' => $template['formatterParams'],
								'hiddenChart' => $template['hiddenChart']
							));
						}

						$cron['templates'][] = $template;
					}
				}
			}
		}

		$this->index();
	}

	protected function getBackups()
	{
		$this->db->select("hb.*, ha.label, IF(hb.url = '', ha.link, hb.url)  as link");
		$this->db->join('ioniqgo_apps as ha', 'ha.id = hb.app_id');
		$this->db->from('ioniqgo_backups AS hb');

		return $this->db->get()->result_array();
	}

	protected function getBackupDir($id, $all = false)
	{
		$path = ($this->backupDir . $id . '/' . ($all ? '' : date('Y-m-d') . '/'));

		if (!is_dir($path)) {
			mkdir($path, 0777, true);
		}

		return $path;
	}

	private function getValidName($name)
	{
		return preg_replace('/[^a-zA-Z0-9\.]/', '-', $name);
	}

	private function backup_shelly($backup)
	{
		$endpoints = array('shelly', 'settings', 'settings/ap', 'settings/sta', 'settings/login', 'settings/cloud', 'settings/actions');
		$backupDir = $this->getBackupDir($this->getValidName($backup['label']));

		$backup['dir'] = $backupDir;

		$auth = $backup['basic_auth'] ? explode(':', $backup['basic_auth']) : array(false, false);
		$backup['response'] = array();
		foreach ($endpoints as $endpoint) {
			$response = $this->getContents($backup['link'] . '/' . $endpoint, 15, array(), false, @$auth[0], @$auth[1]);

			if (isset($response['body'])) {
				file_put_contents($backup['dir'] . preg_replace('/[^a-zA-Z0-9\.]/', '.', $endpoint) . '.json', $response['body']);
			}
			$backup['response'][$endpoint] = $response;
		}

		return $backup;
	}

	public function downloadBackup($name, $date)
	{
		$backupDir = $this->getBackupDir($name . '/' . $date, true);

		$files = is_dir($backupDir) ? glob($backupDir . '*.json') : array();

		if (count($files)) {
			$this->load->library('zip');

			foreach ($files as $file) {
				$this->zip->add_data(basename($file), file_get_contents($file));
			}

			// Download the file to your desktop. Name it "my_backup.zip"
			$this->zip->download($name . '_' . $date . '.zip');
		} else {
			show_404();
		}

		$this->index();
	}

	public function backups()
	{
		$this->data['backups'] = array();
		$backups = $this->getBackups();

		foreach ($backups as $backup) {
			$validName = $this->getValidName($backup['label']);
			$backupDir = $this->getBackupDir($validName, true);
			$dirs = array();
			foreach (array_reverse(glob($backupDir . '*', GLOB_ONLYDIR)) as $index => $dir) {
				$dirs[preg_replace('/.*\/(\d{4}\-\d{2}\-\d{2})/', '$1', $dir)] = count(glob($dir . '/*.json')) > 0;

				if ($index > 30) {
					break;
				}
			}
			$newBackup = array('id' => $backup['id'], 'name' => $validName, 'label' => $backup['label'], 'days' => $dirs);
			$this->data['backups'][] = $newBackup;
		}

		$this->index();
	}

	public function backup()
	{
		$this->data['backups'] = $this->getBackups();

		foreach ($this->data['backups'] as &$backup) {
			$method = 'backup_' . $backup['backup_type'];
			if (method_exists($this, $method)) {
				$backup = $this->$method($backup);
				sleep(2);
			}
		}

		$this->index();
	}

	public function runners()
	{
		$this->setStatus(200, 'OK', __LINE__);

		$this->data['runners'] = $this->getRunners();

		$this->index();
	}

	public function apps()
	{
		$this->setStatus(200, 'OK', __LINE__);

		$this->data['apps'] = $this->getApps();

		$this->index();
	}

	protected function setStatus($code = 200, $text = 'OK', $line = 0)
	{
		$this->data['status'] = (int)$code;
		$this->data['statusText'] = $text;
		$this->data['statusDesc'] = $line;
	}

	protected function getContents($url, $timeout = 15, $headers = array(), $decode = false, $username = false, $password = false)
	{
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_HEADER, true);
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 0);
		curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(array(
			'Content-Type: application/json',
			'Accept: application/json',
			'User-Agent: Home-Services/Runner',
		), $headers));

		if ($username && $password) {
			curl_setopt($ch, CURLOPT_USERPWD, $username . ":" . $password);
		}

		$output = curl_exec($ch);
		$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
		$header = substr($output, 0, $header_size);
		$body = substr($output, $header_size);
		curl_close($ch);

		$header = $this->getHeaders($header);

		if ($decode) {
			if (isset($header['Content-Type']) && stristr($header['Content-Type'], 'application/json')) {
				$body = json_decode($body, true);
			} else if (isset($header['Content-Type']) && stristr($header['Content-Type'], 'application/zip')) {
				$body = unserialize(gzuncompress(base64_decode($body)));
			}
		}

		return array('headers' => $header, 'body' => $body);
	}

	private function getHeaders($headerString)
	{
		$headers = array_filter(preg_split("/\r?\n/", $headerString));
		$parsedHeaders = array();
		foreach ($headers as $r) {
			if (preg_match('/[^\:]+\:/', $r)) {
				list($headername, $headervalue) = explode(":", $r, 2);
				$parsedHeaders[trim($headername)] = trim($headervalue);
			} else if (stripos($r, 'HTTP/') === 0) {
				list(, $code, $status) = explode(' ', $r, 3);
				$parsedHeaders['status'] = (int)$code;
				$parsedHeaders['statusText'] = $status;
			}
		}

		return $parsedHeaders;
	}



	protected function postContents($url, $params, $timeout = 15, $headers = array(), $decode = false, $username = false, $password = false)
	{
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_HEADER, true);
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, false);
		curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(array(
			'Content-Type: application/json',
			'Accept: application/json',
			'User-Agent: Home-Services/Runner',
		), $headers));
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));

		if ($username && $password) {
			curl_setopt($ch, CURLOPT_USERPWD, $username . ":" . $password);
		}

		$output = curl_exec($ch);
		$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
		$header = substr($output, 0, $header_size);
		$body = substr($output, $header_size);
		curl_close($ch);

		$header = $this->getHeaders($header);

		if ($decode) {
			if (isset($header['Content-Type']) && stristr($header['Content-Type'], 'application/json')) {
				$body = json_decode($body, true);
			} else if (isset($header['Content-Type']) && stristr($header['Content-Type'], 'application/zip')) {
				$body = unserialize(gzuncompress(base64_decode($body)));
			}
		}

		return array('headers' => $header, 'body' => $body);
	}
}
