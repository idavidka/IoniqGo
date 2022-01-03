<?php
defined('BASEPATH') OR exit('No direct script access allowed');

abstract class EV_DB_query_builder extends CI_DB_query_builder {
	protected $qb_calc_rows = false;

	public function calc_rows() {
		$this->qb_calc_rows = true;

		return $this;
	}

	public function found_rows() {
		$found_rows = $this->query('SELECT FOUND_ROWS() count')->row()->count;
		$calc = array_pop($this->queries);
		// $this->queries[count($this->queries) - 1] .= '; '.$calc;

		return $found_rows;
	}

	protected function _reset_select()
	{
		$this->_reset_run(array(
			'qb_select'		=> array(),
			'qb_from'		=> array(),
			'qb_join'		=> array(),
			'qb_where'		=> array(),
			'qb_groupby'		=> array(),
			'qb_having'		=> array(),
			'qb_orderby'		=> array(),
			'qb_aliased_tables'	=> array(),
			'qb_no_escape'		=> array(),
			'qb_distinct'		=> FALSE,
			'qb_limit'		=> FALSE,
			'qb_offset'		=> FALSE,
			'qb_calc_rows'	=> FALSE,
		));
	}
	
	protected function _compile_select($select_override = FALSE)
	{
		// Combine any cached components with the current statements
		$this->_merge_cache();

		// Write the "select" portion of the query
		if ($select_override !== FALSE)
		{
			$sql = $select_override;
		}
		else
		{
			$sql = ( ! $this->qb_distinct) ? 'SELECT ' : 'SELECT DISTINCT ';
			$sql .= ($this->qb_calc_rows) ? ' SQL_CALC_FOUND_ROWS ' : '';

			if (count($this->qb_select) === 0)
			{
				$sql .= '*';
			}
			else
			{
				// Cycle through the "select" portion of the query and prep each column name.
				// The reason we protect identifiers here rather than in the select() function
				// is because until the user calls the from() function we don't know if there are aliases
				foreach ($this->qb_select as $key => $val)
				{
					$no_escape = isset($this->qb_no_escape[$key]) ? $this->qb_no_escape[$key] : NULL;
					$this->qb_select[$key] = $this->protect_identifiers($val, FALSE, $no_escape);
				}

				$sql .= implode(', ', $this->qb_select);
			}
		}

		return parent::_compile_select($sql);
	}
}
