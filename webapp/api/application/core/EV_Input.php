<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class EV_Input extends CI_Input {

	public function get($index = NULL, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::get($index, $xss_clean);

		return $value !== null ? $value : $default;
	}
	
	public function post($index = NULL, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::post($index, $xss_clean);

		return $value !== null ? $value : $default;
	}
	
	public function post_get($index, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::post_get($index, $xss_clean);

		return $value !== null ? $value : $default;
	}
	
	public function get_post($index, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::get_post($index, $xss_clean);

		return $value !== null ? $value : $default;
	}
	
	public function cookie($index = NULL, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::cookie($index, $xss_clean);

		return $value !== null ? $value : $default;
	}

	public function server($index, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::server($index, $xss_clean);

		return $value !== null ? $value : $default;
	}

	public function input_stream($index = NULL, $default = NULL, $xss_clean = NULL)
	{
		$value = parent::input_stream($index, $xss_clean);

		return $value !== null ? $value : $default;
	}
}
