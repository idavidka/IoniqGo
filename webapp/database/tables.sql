
--
-- Table structure for table `ioniqgo_apps`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_apps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order` int(11) DEFAULT NULL,
  `label` varchar(255) NOT NULL,
  `app` varchar(255) NOT NULL,
  `link` varchar(255) NOT NULL,
  `icon` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `label` (`label`),
  KEY `app` (`app`,`link`,`icon`),
  KEY `order` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_backups`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_backups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `basic_auth` varchar(255) NOT NULL,
  `backup_type` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `app_id` (`app_id`,`backup_type`),
  KEY `url` (`url`),
  KEY `basic_auth` (`basic_auth`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=7 ;

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_crons`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_crons` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `runner_id` int(11) NOT NULL,
  `min` varchar(255) NOT NULL,
  `hour` varchar(255) NOT NULL,
  `dom` varchar(255) NOT NULL,
  `mon` varchar(255) NOT NULL,
  `dow` varchar(255) NOT NULL,
  `template_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hour` (`hour`),
  KEY `min` (`min`),
  KEY `runner_id` (`runner_id`),
  KEY `dom` (`dom`),
  KEY `mon` (`mon`),
  KEY `dow` (`dow`),
  KEY `template_id` (`template_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=6 ;

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_cron_savings`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_cron_savings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cron_id` int(11) NOT NULL,
  `template_id` int(11) NOT NULL,
  `value` varchar(255) NOT NULL DEFAULT '0',
  `valueAbbreviation` tinyint(1) NOT NULL DEFAULT 0,
  `appendix` varchar(10) NOT NULL DEFAULT '',
  `formatter` varchar(255) NOT NULL,
  `formatterParams` varchar(255) CHARACTER SET utf16 NOT NULL,
  `time` datetime NOT NULL,
  `hiddenChart` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `time` (`time`),
  KEY `value` (`value`),
  KEY `cron_id` (`cron_id`),
  KEY `appendix` (`appendix`),
  KEY `valueAbbreviation` (`valueAbbreviation`),
  KEY `template_id` (`template_id`),
  KEY `hiddenChart` (`hiddenChart`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_pulls`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_pulls` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `runner_id` int(11) NOT NULL,
  `template_id` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `runner_id` (`runner_id`),
  KEY `template_id` (`template_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=7 ;

--
-- Dumping data for table `ioniqgo_pulls`
--

INSERT INTO `ioniqgo_pulls` (`id`, `runner_id`, `template_id`) VALUES
(1, 20, '74,75,77,78,79,80,81,82,84,85,86,87,88,89,90,91,92,93,94');

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_pull_savings`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_pull_savings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pull_id` int(11) NOT NULL,
  `template_id` varchar(255) DEFAULT NULL,
  `value` varchar(2047) NOT NULL DEFAULT '0',
  `formatter` varchar(255) NOT NULL,
  `formatterParams` varchar(255) CHARACTER SET utf16 NOT NULL,
  `time` datetime NOT NULL,
  `hiddenChart` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `time` (`time`),
  KEY `value` (`value`(1024)),
  KEY `pull_id` (`pull_id`),
  KEY `template_id` (`template_id`),
  KEY `hiddenChart` (`hiddenChart`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=60183 ;

--
-- Dumping data for table `ioniqgo_pull_savings`
--

INSERT INTO `ioniqgo_pull_savings` (`id`, `pull_id`, `template_id`, `value`, `formatter`, `formatterParams`, `time`, `hiddenChart`) VALUES
(60172, 1, '75', '', '', '%', '2022-01-02 09:11:19', 1),
(60173, 1, '74', '12', '', 'km/h', '2022-01-02 09:11:19', 0),
(60174, 1, '77', '47.179688867884835, 18.41703530623231', 'map', '°', '2022-01-02 09:11:19', 0),
(60175, 1, '82', 'D', '', '', '2022-01-02 09:11:19', 0),
(60176, 1, '89', '4.10', '', 'V', '2022-01-02 09:11:19', 1),
(60177, 1, '88', '56', '', '', '2022-01-02 09:11:19', 1),
(60178, 1, '91', '4.10', '', 'V', '2022-01-02 09:11:19', 1),
(60179, 1, '90', '21', '', '', '2022-01-02 09:11:19', 1),
(60180, 1, '87', '100', '', '%', '2022-01-02 09:11:19', 1),
(60181, 1, '78', '99', '', '%', '2022-01-02 09:11:19', 0),
(60182, 1, '84', '14.60', '', 'V', '2022-01-02 09:11:19', 0);

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runners`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runners` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group` int(11) DEFAULT NULL,
  `order` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `icon` varchar(255) NOT NULL,
  `foreground` varchar(255) NOT NULL,
  `background` varchar(255) NOT NULL,
  `on_demand_runner_id` int(11) DEFAULT NULL,
  `on_demand_template_id` varchar(255) DEFAULT NULL,
  `single` tinyint(1) NOT NULL DEFAULT 0,
  `periodical` tinyint(1) NOT NULL DEFAULT 0,
  `on_demand_delay` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `name` (`name`),
  KEY `icon` (`icon`,`foreground`,`background`),
  KEY `order` (`order`),
  KEY `run_on_demand_id` (`on_demand_runner_id`),
  KEY `run_on_demand_template_id` (`on_demand_template_id`),
  KEY `single` (`single`),
  KEY `group` (`group`),
  KEY `delay` (`on_demand_delay`),
  KEY `periodical` (`periodical`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=21 ;

--
-- Dumping data for table `ioniqgo_runners`
--

INSERT INTO `ioniqgo_runners` (`id`, `group`, `order`, `name`, `key`, `icon`, `foreground`, `background`, `on_demand_runner_id`, `on_demand_template_id`, `single`, `periodical`, `on_demand_delay`) VALUES
(20, 1, 0, 'Ioniq', 'ioniq', 'GiCityCar', '#03316c', 'white', NULL, NULL, 1, 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runners_x_templates`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runners_x_templates` (
  `runner_id` int(10) unsigned NOT NULL,
  `template_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`runner_id`,`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `ioniqgo_runners_x_templates`
--

INSERT INTO `ioniqgo_runners_x_templates` (`runner_id`, `template_id`) VALUES
(20, 74),
(20, 75),
(20, 77),
(20, 78),
(20, 79),
(20, 80),
(20, 81),
(20, 82),
(20, 83),
(20, 84),
(20, 85),
(20, 86),
(20, 87),
(20, 88),
(20, 89),
(20, 90),
(20, 91),
(20, 92),
(20, 93),
(20, 94);

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runner_admin`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runner_admin` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `token` varchar(511) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `username` (`username`,`password`),
  KEY `token` (`token`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2 ;

--
-- Dumping data for table `ioniqgo_runner_admin`
--

INSERT INTO `ioniqgo_runner_admin` (`id`, `username`, `password`, `token`) VALUES
(1, 'demo', 'a160810decd7b8e1818947b61d5da010fb3bd1c4', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImlkYXZpZCIsInJlZnJlc2hlZCI6dHJ1ZSwiaXNzdWVkIjoxNjQxMDc0OTI0LCJleHBpcmVzIjoxNjQxMDc2NzI0fQ.8OfVD4D3KgKEBgMeo4tdzo26HK1mEWwGlYx-w3VkMck');

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runner_admin_tokens`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runner_admin_tokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `token` varchar(511) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runner_groups`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runner_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=7 ;

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runner_templates`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runner_templates` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `order` int(11) NOT NULL,
  `label` varchar(255) NOT NULL,
  `labelElse` varchar(255) DEFAULT NULL,
  `key` varchar(255) NOT NULL,
  `valueIf` varchar(255) DEFAULT NULL,
  `valueElse` varchar(255) DEFAULT NULL,
  `valueDependsOn` varchar(255) DEFAULT NULL,
  `valueAbbreviation` tinyint(1) NOT NULL DEFAULT 0,
  `appendix` varchar(255) NOT NULL,
  `formatter` varchar(255) NOT NULL,
  `formatterParams` varchar(255) NOT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT 0,
  `hiddenElse` tinyint(1) NOT NULL DEFAULT 0,
  `hiddenChart` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `runner_id` (`order`,`label`,`key`),
  KEY `valueIf` (`valueIf`,`valueElse`),
  KEY `appendix` (`appendix`),
  KEY `parent_id` (`parent_id`),
  KEY `valueDependsOn` (`valueDependsOn`),
  KEY `valueAbbreviation` (`valueAbbreviation`),
  KEY `labelElse` (`labelElse`),
  KEY `hidden` (`hidden`),
  KEY `hiddenElse` (`hiddenElse`),
  KEY `formatter` (`formatter`),
  KEY `formatterParams` (`formatterParams`),
  KEY `hiddenChart` (`hiddenChart`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT AUTO_INCREMENT=95 ;

--
-- Dumping data for table `ioniqgo_runner_templates`
--

INSERT INTO `ioniqgo_runner_templates` (`id`, `parent_id`, `order`, `label`, `labelElse`, `key`, `valueIf`, `valueElse`, `valueDependsOn`, `valueAbbreviation`, `appendix`, `formatter`, `formatterParams`, `hidden`, `hiddenElse`, `hiddenChart`) VALUES
(74, NULL, 2, 'Speed', NULL, 'speed', NULL, NULL, NULL, 1, 'km/h', '', 'km/h', 0, 0, 0),
(75, NULL, 4, 'Battery', NULL, 'battery', NULL, NULL, NULL, 1, '', '', '%', 1, 0, 1),
(77, NULL, 12, 'Location', NULL, 'latitude,longitude', NULL, NULL, NULL, 1, '', 'map', '°', 0, 0, 0),
(78, NULL, 4, 'SOC', NULL, 'soc', NULL, NULL, NULL, 1, '', '', '%', 0, 0, 0),
(80, NULL, 1, 'PID2101', NULL, 'pid2101', NULL, NULL, NULL, 1, '', '', '', 1, 0, 1),
(81, NULL, 1, 'PID2105', NULL, 'pid2105', NULL, NULL, NULL, 1, '', '', '', 1, 0, 1),
(82, NULL, 1, 'Gear', NULL, 'gear', NULL, NULL, NULL, 1, '', '', '', 0, 0, 0),
(83, NULL, 0, 'Time', NULL, 'time', NULL, NULL, NULL, 1, '', '', '', 0, 0, 1),
(84, NULL, 5, 'Aux. Battery', NULL, 'aux', NULL, NULL, NULL, 1, '', '', 'V', 0, 0, 0),
(85, NULL, 6, 'Charging type', NULL, 'chargingType', NULL, NULL, NULL, 1, '', '', '', 0, 0, 0),
(86, NULL, 7, 'Charging power', NULL, 'chargingPower', NULL, NULL, NULL, 1, '', 'abbreviation', 'W,kW,MW,GW', 0, 0, 0),
(87, NULL, 3, 'SOH', NULL, 'soh', NULL, NULL, NULL, 1, '', '', '%', 0, 0, 1),
(88, NULL, 8, 'Min cell voltage no.', NULL, 'minVoltageNo', NULL, NULL, NULL, 1, '', '', '', 0, 0, 1),
(89, NULL, 9, 'Min cell voltage', NULL, 'minVoltage', NULL, NULL, NULL, 1, '', '', 'V', 0, 0, 1),
(90, NULL, 10, 'Max cell voltage no.', NULL, 'maxVoltageNo', NULL, NULL, NULL, 1, '', '', '', 0, 0, 1),
(91, NULL, 11, 'Max cell voltage', NULL, 'maxVoltage', NULL, NULL, NULL, 1, '', '', 'V', 0, 0, 1),
(92, NULL, 1, 'PID2102', NULL, 'pid2102', NULL, NULL, NULL, 1, '', '', '', 1, 0, 1),
(93, NULL, 5, 'Aux. Battery (VCU)', NULL, 'auxVcu', NULL, NULL, NULL, 1, '', '', 'V', 0, 0, 0),
(94, NULL, 1, 'PID debug', NULL, 'pids', NULL, NULL, NULL, 1, '', '', '', 1, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ioniqgo_runner_urls`
--

CREATE TABLE IF NOT EXISTS `ioniqgo_runner_urls` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `runner_id` int(11) NOT NULL,
  `step` int(11) NOT NULL,
  `url` varchar(511) NOT NULL,
  `method` enum('post','get') NOT NULL DEFAULT 'get',
  `params` text NOT NULL,
  `stopOnKey` varchar(255) NOT NULL,
  `stopOnValue` varchar(255) NOT NULL,
  `stopOnMessage` varchar(255) NOT NULL,
  `stopWithError` tinyint(1) NOT NULL DEFAULT 1,
  `delay` int(11) NOT NULL DEFAULT 0 COMMENT 'seconds',
  `basicAuth` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `runner_id_2` (`runner_id`,`step`),
  UNIQUE KEY `runner_id_3` (`runner_id`,`step`),
  KEY `runner_id` (`runner_id`,`step`,`url`),
  KEY `method` (`method`),
  KEY `basicAuth` (`basicAuth`),
  KEY `stopOnKey` (`stopOnKey`,`stopOnValue`),
  KEY `stopOnMessage` (`stopOnMessage`),
  KEY `delay` (`delay`),
  KEY `stopWithError` (`stopWithError`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=36 ;

--
-- Dumping data for table `ioniqgo_runner_urls`
--

INSERT INTO `ioniqgo_runner_urls` (`id`, `runner_id`, `step`, `url`, `method`, `params`, `stopOnKey`, `stopOnValue`, `stopOnMessage`, `stopWithError`, `delay`, `basicAuth`) VALUES
(35, 20, 1, 'self://last-pull', 'get', '', '', '', '', 1, 0, NULL);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
