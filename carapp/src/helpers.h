void debug()
{
    if (DEBUG || PRINTLN_ALLOWED)
    {
        Serial.println();
    }
}

void debug(String message)
{
    if (DEBUG || PRINTLN_ALLOWED)
    {
        Serial.println(message);
    }
}

void debug(String label, String message)
{
    if (DEBUG || PRINTLN_ALLOWED)
    {
        Serial.print(label);
        Serial.print(": ");
        Serial.println(message);
    }
}

void debug(String label, int message)
{
    debug(label, String(message));
}

void debug(String label, float message, int decimal = 4)
{
    debug(label, String(message));
}

void debug(int message)
{
    debug(String(message));
}

void debug(bool message)
{
    debug(message ? "true" : "false");
}

void debug(float message, int decimal = 4)
{
    debug(String(message, decimal));
}

void debug(const char *message)
{
    debug(String(message));
}

bool areCoordsEquals(float coord1, float coord2)
{
    float start1 = coord1 - 0.001;
    float end1 = coord1 + 0.001;

    float start2 = coord2 - 0.001;
    float end2 = coord2 + 0.001;

    return (coord1 > start2 && coord1 < end2) || (coord2 > start1 && coord2 < end1);
}

String getShortCoord(float coord)
{
    return String(coord, 4);
}

String getLongCoord(float coord)
{
    return String(coord, 16);
}

String urlencode(String str)
{
    String encodedString = "";
    char c;
    char code0;
    char code1;
    // char code2;
    for (int i = 0; i < str.length(); i++)
    {
        c = str.charAt(i);
        if (c == ' ')
        {
            encodedString += '+';
        }
        else if (isalnum(c))
        {
            encodedString += c;
        }
        else
        {
            code1 = (c & 0xf) + '0';
            if ((c & 0xf) > 9)
            {
                code1 = (c & 0xf) - 10 + 'A';
            }
            c = (c >> 4) & 0xf;
            code0 = c + '0';
            if (c > 9)
            {
                code0 = c - 10 + 'A';
            }
            // code2 = '\0';
            encodedString += '%';
            encodedString += code0;
            encodedString += code1;
            //encodedString+=code2;
        }
        yield();
    }
    return encodedString;
}

String getValue(String data, String separator, int index, bool all = false)
{
    int found = 0;
    int maxIndex = data.length() - 1;
    int separatorLength = separator.length();
    int strIndex[] = {0, -separatorLength};

    // debug("data", data);
    // debug("separator", separator);
    // debug("index", index);
    // debug("max", maxIndex);
    for (int i = 0; i <= maxIndex && found <= index; i++)
    {
        // debug("i", i);
        // debug("is", i + separatorLength);
        // debug("max", maxIndex);
        if ((data + "    ").substring(i, i + separatorLength) == separator || i + separatorLength >= maxIndex)
        {
            found++;
            strIndex[0] = strIndex[1] + separatorLength;
            strIndex[1] = (i + separatorLength >= maxIndex) ? i + separatorLength + 1 : i;
        }
    }
    // debug("index0", strIndex[0]);
    // debug("index1", strIndex[1]);
    return found > index ? data.substring(strIndex[0], all ? maxIndex : strIndex[1]) : "";
}

String getValue(String data, String startSeparator, String endSeparator, bool captureFlag = false)
{
    String start = getValue(data, startSeparator, 1);
    // debug("START", start);
    String found = getValue(start, endSeparator, 0);
    // debug("FOUND", found);

    if (found)
    {
        return (captureFlag ? startSeparator : "") + found;
    }
    return found;
}
String getPidPlace(String pid, String header)
{
    int indexOfHeader = pid.indexOf(header);
    if (indexOfHeader < 0)
    {
        return "";
    }

    return pid.substring(indexOfHeader + header.length(), indexOfHeader + header.length() + 14);
}

void getPidValue(String key, String body, String &retValue)
{
    String pidType = "";
    String pidKey = "";
    long pidPlace[] = {-1, -1, -1, -1};
    bool allowConcat = true;

    if (key == "soc")
    {
        pidType = "6105";
        pidPlace[0] = 3;
        pidPlace[1] = 6;
        pidKey = "7EC2";
    }
    else if (key == "soh")
    {
        pidType = "6105";
        pidPlace[0] = 3;
        pidPlace[1] = 0;
        pidPlace[2] = 1;
        pidKey = "7EC2";
    }
    else if (key == "availChargePower")
    {
        pidType = "6105";
        pidPlace[0] = 1;
        pidPlace[1] = 5;
        pidPlace[2] = 6;
        pidKey = "7EC2";
    }
    else if (key == "availDischargePower")
    {
        pidType = "6105";
        pidPlace[0] = 2;
        pidPlace[1] = 0;
        pidPlace[2] = 1;
        pidKey = "7EC2";
    }
    else if (key == "chargingType")
    {
        pidType = "6101";
        pidPlace[0] = 0;
        pidPlace[1] = 5;
        pidKey = "7EC2";
    }
    else if (key == "chargingCurrent")
    {
        pidType = "6101";
        pidPlace[0] = 0;
        pidPlace[1] = 6;
        pidPlace[2] = 1;
        pidPlace[3] = 0;
        pidKey = "7EC2";
    }
    else if (key == "chargingVoltage")
    {
        pidType = "6101";
        pidPlace[0] = 1;
        pidPlace[1] = 1;
        pidPlace[2] = 2;
        pidKey = "7EC2";
    }
    else if (key == "chargingPower")
    {
        pidType = "6101";
        pidPlace[0] = -2;
        pidKey = "7EC2";
    }
    else if (key == "auxiliary")
    {
        pidType = "6101";
        pidPlace[0] = 3;
        pidPlace[1] = 4;
        pidKey = "7EC2";
    }
    else if (key == "auxiliary_vcu")
    {
        pidType = "6101";
        pidPlace[0] = 0;
        pidPlace[1] = 2;
        pidKey = "7EA2";
    }
    else if (key == "gear")
    {
        pidType = "6101";
        pidPlace[0] = 0;
        pidPlace[1] = 1;
        pidKey = "7EA2";
    }
    else if (key == "speed")
    {
        pidType = "6101";
        pidPlace[0] = 1;
        pidPlace[1] = 3;
        pidPlace[2] = 2;
        pidKey = "7EA2";
        allowConcat = false;
    }
    else if (key == "minCellVoltage")
    {
        pidType = "6101";
        pidPlace[0] = 3;
        pidPlace[1] = 0;
        pidKey = "7EC2";
    }
    else if (key == "maxCellVoltage")
    {
        pidType = "6101";
        pidPlace[0] = 2;
        pidPlace[1] = 5;
        pidKey = "7EC2";
    }
    else if (key == "minCellVoltageNo")
    {
        pidType = "6101";
        pidPlace[0] = 3;
        pidPlace[1] = 1;
        pidKey = "7EC2";
    }
    else if (key == "maxCellVoltageNo")
    {
        pidType = "6101";
        pidPlace[0] = 2;
        pidPlace[1] = 6;
        pidKey = "7EC2";
    }

    if (pidType == "" || pidKey == "" || pidPlace[0] == -1)
    {
        return;
    }

    // debug("BODY", body);
    // String flag = getValue(body, pidType, "7EC", true);
    // debug("FLAG", flag);

    long value = 0;
    long value2 = 0;
    String hexValue = "";
    String hexValue2 = "";
    debug("PID", key);
    if (pidPlace[0] >= 0)
    {
        String response = body; //getValue(body, flag, 1);
        debug("RESPONSE", response);
        debug("KEY", pidKey);
        String *pid = new String[8];
        // pid[0] = getValue(response + "7EC22        ", "7EC21", "7EC22");
        // pid[1] = getValue(response + "7EC23        ", "7EC22", "7EC23");
        // pid[2] = getValue(response + "7EC24        ", "7EC23", "7EC24");
        // pid[3] = getValue(response + "7EC25        ", "7EC24", "7EC25");
        // pid[4] = getValue(response + "7EC26        ", "7EC25", "7EC26");
        // pid[5] = getValue(response + "7EC27        ", "7EC26", "7EC27");
        // pid[6] = getValue(response + "7EC28        ", "7EC27", "7EC28");
        // pid[7] = getValue(response + "7EC29        ", "7EC28", "7EC29");
        pid[0] = getPidPlace(response, pidKey + "1");
        pid[1] = getPidPlace(response, pidKey + "2");
        pid[2] = getPidPlace(response, pidKey + "3");
        pid[3] = getPidPlace(response, pidKey + "4");
        pid[4] = getPidPlace(response, pidKey + "5");
        pid[5] = getPidPlace(response, pidKey + "6");
        pid[6] = getPidPlace(response, pidKey + "7");
        pid[7] = getPidPlace(response, pidKey + "8");

        debug("PART0", pid[0]);
        debug("PART1", pid[1]);
        debug("PART2", pid[2]);
        debug("PART3", pid[3]);
        debug("PART4", pid[4]);
        debug("PART5", pid[5]);
        debug("PART6", pid[6]);
        debug("PART7", pid[7]);

        String selectedPlace = pid[pidPlace[0]];
        long pidPosition = (pidPlace[1] * 2);

        // if (selectedPlace.length() > 1)
        // {
        //     selectedPlace = selectedPlace.substring(0, selectedPlace.length() - 1);
        // }

        hexValue = selectedPlace.substring(pidPosition, pidPosition + 2);
        hexValue2 = "";

        debug("Selected", selectedPlace);

        if (pidPlace[2] > -1 && pidPlace[3] <= -1)
        {
            long pidPosition2 = (pidPlace[2] * 2);
            hexValue2 = selectedPlace.substring(pidPosition2, pidPosition2 + 2);
        }
        else if (pidPlace[2] > -1 && pidPlace[3] > -1)
        {
            String selectedPlace2 = pid[pidPlace[2]];
            long pidPosition2 = (pidPlace[3] * 2);
            hexValue2 = selectedPlace2.substring(pidPosition2, pidPosition2 + 2);
        }

        debug("Hex", hexValue);
        debug("Hex2", hexValue2);

        if (allowConcat)
        {
            value = strtol((hexValue + hexValue2).c_str(), NULL, 16);
        }
        else
        {
            value = strtol(hexValue.c_str(), NULL, 16);
            value2 = strtol(hexValue2.c_str(), NULL, 16);
        }
        debug("Dec", String(value));
        debug("Dec2", String(value2));
    }

    if (key == "soc")
    {
        retValue = String(value * 0.5);
    }
    else if (key == "availChargePower" || key == "availDischargePower")
    {
        retValue = String(value * 0.01);
    }
    else if (key == "chargingVoltage" || key == "auxiliary" || key == "auxiliary_vcu" || key == "soh")
    {
        retValue = String(value * 0.1);
    }
    else if (key == "minCellVoltage" || key == "maxCellVoltage")
    {
        retValue = String(value * 0.02);
    }
    else if (key == "minCellVoltageNo" || key == "maxCellVoltageNo")
    {
        retValue = String(value);
    }
    else if (key == "chargingType")
    {
        String charging = "";
        if (bitRead(value, 7))
        {
            if (bitRead(value, 6))
            {
                charging = "DC";
            }
            if (bitRead(value, 5))
            {
                charging = "AC";
            }
        }

        retValue = charging;
    }
    else if (key == "chargingCurrent")
    {
        value = abs(((value + 32768) % 65536 - 32768) * 0.2);
        retValue = String(value);
    }
    else if (key == "chargingPower")
    {
        String voltage;
        String current;
        getPidValue("chargingCurrent", body, current);
        getPidValue("chargingVoltage", body, voltage);

        retValue = String(abs(voltage.toFloat() * (current.toFloat() * 0.5)));
    }
    else if (key == "gear")
    {
        String gear = "";
        if (bitRead(value, 0))
        {
            gear = "P";
        }
        if (bitRead(value, 1))
        {
            gear = "R";
        }
        if (bitRead(value, 2))
        {
            gear = "N";
        }
        if (bitRead(value, 3))
        {
            gear = "D";
        }

        retValue = gear;
        // debug("Gear", gear);
    }
    else if (key == "speed")
    {
        debug("SPEED O", String(value));
        debug("SPEED N", String(value2));
        float current_speed;
        value += 128;
        current_speed = ((value % 256 - 128) * 256 + value2) / 100.0 * 1.60934;
        debug("SPEED real", String(current_speed));
        retValue = String(current_speed);
    }
    else
    {
        retValue = String(value);
    }
}