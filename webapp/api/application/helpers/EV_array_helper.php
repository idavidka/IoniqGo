<?php

if (!function_exists('leading_zero')) {
    function leading_zero($number, $length = 1)
    {
        return
            str_pad($number, $length, '0', STR_PAD_LEFT);
    }
}

if (!function_exists('print_r_pre')) {
    function print_r_pre($data, $return = false)
    {
        $output = '<pre>' . print_r($data, true) . '</pre>';

        if ($return) {
            return $output;
        }

        print $output;
    }
}

if (!function_exists('get_item')) {
    $GLOBALS['mappedCallbacks'] = array(
        "@html" => function ($_, $found) {
            return (@$found['keyLast'] ? "." : "") . "@html";
        },
        "@json" => function ($_, $found) {
            return (@$found['keyLast'] ? "." : "") . "@json";
        },
        "@record" => function ($_, $found) {
            return (@$found['keyLast'] ? "." : "") . "@record";
        },
        "@last" => function ($obj, $found) {
            $keys = array_keys($obj);
            return (@$found['keyLast'] ? "." : "") . end($keys);
        },
        "@first" => function ($obj, $found) {
            $keys = array_keys($obj);
            return (@$found['keyLast'] ? "." : "") . isset($keys[0]) ? $keys[0] : '';
        },
    );
    $GLOBALS['mappedKeys'] = array_keys($GLOBALS['mappedCallbacks']);
    function get_item($object, $key)
    {
        $mappedKeys = $GLOBALS['mappedKeys'];
        $check = array('object' => $object);
        $replacedKey = $key;
        foreach ($mappedKeys as $mappedKey) {
            $mappedRegex = '/(?<rule>(^(?<keyFirst>' . $mappedKey . ')|.(?<keyLast>' . $mappedKey . '))(\((?<params>[^\)]+)\))?)/m';
            $foundKey = array();
            preg_match($mappedRegex, $replacedKey, $foundKey);

            if (isset($foundKey['rule'])) {
                $mainKey = explode($foundKey['rule'], $replacedKey);
                $mainKey = isset($mainKey[0]) ? $mainKey[0] : null;

                $mainObj = $mainKey ? get($check['object'], $mainKey) : $check['object'];

                if ($mainObj && in_array($mappedKey, array('@html', '@json', '@record'))) {
                    $content = array();

                    if (gettype($mainObj) === 'string' && $mappedKey === '@html' && isset($foundKey['params'])) {
                        $html = Domquery::newDocumentHTML($mainObj);
                        $element = $html->find($foundKey['params']);
                        $content = array(
                            $mappedKey => $element ? $element->text() : array()
                        );
                    } else if (gettype($mainObj) === 'string' && $mappedKey === '@json') {
                        try {
                            $content = array($mappedKey =>  json_decode($mainObj, true));
                        } catch (Exception $err) {
                            $content = array();
                        }
                    } else if (is_array($mainObj) && $mappedKey === "@record") {
                        //no support needed for @record in API as we dont want save multiple data to chart
                    }

                    if (!$mainKey) {
                        $check['object'] = $content;
                    } else {
                        $check['object'] = set($check['object'], $mainKey, $content);
                    }

                    $replacedKey = preg_replace($mappedRegex, $GLOBALS['mappedCallbacks'][$mappedKey]($mainObj, $foundKey), $replacedKey);
                } else if ($mainObj && is_array($mainObj)) {
                    $replacedKey = preg_replace($mappedRegex, $GLOBALS['mappedCallbacks'][$mappedKey]($mainObj, $foundKey), $replacedKey);
                }
            }
        }

        return get($check['object'], $replacedKey);
    }

    // function get_item($collection = [], $key = null, $default = null)
    // {
    //     if (is_null($key)) {
    //         return $collection;
    //     }

    //     if (!is_object($collection) && isset($collection[$key])) {
    //         return $collection[$key];
    //     }

    //     foreach (explode('.', $key) as $segment) {
    //         if (is_object($collection)) {
    //             if (!isset($collection->{$segment})) {
    //                 return $default;
    //             } else {
    //                 $collection = $collection->{$segment};
    //             }
    //         } else {
    //             if ($segment === '@first' || $segment === '@last') {
    //                 $keys = array_keys($collection);
    //                 if ($segment === '@first') {
    //                     $segment = 0;
    //                 } else {
    //                     $segment = end($keys);
    //                 }
    //             }
    //             if (!isset($collection[$segment])) {
    //                 return $default;
    //             } else {
    //                 $collection = $collection[$segment];
    //             }
    //         }
    //     }

    //     return $collection;
    // }
}

if (!function_exists('get')) {
    function get($collection = [], $key = null, $default = null)
    {
        if (is_null($key)) {
            return $collection;
        }

        if (!is_object($collection) && isset($collection[$key])) {
            return $collection[$key];
        }

        foreach (explode('.', $key) as $segment) {
            if (is_object($collection)) {
                if (!isset($collection->{$segment})) {
                    return $default instanceof Closure ? $default() : $default;
                } else {
                    $collection = $collection->{$segment};
                }
            } else {
                if (!isset($collection[$segment])) {
                    return $default instanceof Closure ? $default() : $default;
                } else {
                    $collection = $collection[$segment];
                }
            }
        }

        return $collection;
    }
}


if (!function_exists('has')) {
    function has($collection, $path)
    {
        $portions = explode('.', $path, 2);
        $key = $portions[0];

        if (count($portions) === 1) {
            return array_key_exists($key, (array)$collection);
        }

        return has(get($collection, $key), $portions[1]);
    }
}

if (!function_exists('universalSet')) {
    function universalSet($collection, $key, $value)
    {
        $set_object = function ($object, $key, $value) {
            $newObject = clone $object;
            $newObject->$key = $value;

            return $newObject;
        };
        $set_array = function ($array, $key, $value) {
            $array[$key] = $value;

            return $array;
        };
        $setter = is_object($collection) ? $set_object : $set_array;

        return call_user_func_array($setter, [$collection, $key, $value]);
    }
}

if (!function_exists('set')) {
    function set($collection, $path, $value = null)
    {
        if ($path === null) {
            return $collection;
        }
        $portions = explode('.', $path, 2);

        $key = $portions[0];
        if (count($portions) === 1) {
            return universalSet($collection, $key, $value);
        }
        // Here we manage the case where the portion of the path points to nothing,
        // or to a value that does not match the type of the source collection
        // (e.g. the path portion 'foo.bar' points to an integer value, while we
        // want to set a string at 'foo.bar.fun'. We first set an object or array
        //  - following the current collection type - to 'for.bar' before setting
        // 'foo.bar.fun' to the specified value).
        if (
            !has($collection, $key)
            || (is_object($collection) && !is_object(get($collection, $key)))
            || (is_array($collection) && !is_array(get($collection, $key)))
        ) {
            $collection = universalSet($collection, $key, is_object($collection) ? new stdClass : array());
        }

        return universalSet($collection, $key, set(get($collection, $key), $portions[1], $value));
    }
}
