<?php

if ( ! function_exists('request_uri'))
{
	function request_uri()
	{
		return $_SERVER['REQUEST_URI'] ? $_SERVER['REQUEST_URI'] : '';
	}
}