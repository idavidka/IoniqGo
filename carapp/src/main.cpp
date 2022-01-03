#include "config.h"
#include "settings.h"
#include "helpers.h"

#include <WiFi.h>
#include <math.h>
#include <string.h>
#include "BluetoothSerial.h"
#include "ELMduino.h"

// TTGO configs
TTGOClass *ttgo = nullptr;
AXP20X_Class *power;
TFT_eSPI *tft;
int batteryPercent = 100;
int batteryMillis = -120000L;

// Bluetooth configs
BluetoothSerial SerialBT;
#define ELM_PORT SerialBT

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);

// Sleeping configs
bool canSleep = false;
bool canDeepSleep = false;
static bool irq_axp202 = false;
bool exitMessageShown = false;

// SIM configs
RTC_DATA_ATTR bool simUnlocked = false;

// GPS configs
RTC_DATA_ATTR bool gpsEnabled = false;
RTC_DATA_ATTR float gpsLat = 0;
RTC_DATA_ATTR float gpsLon = 0;
RTC_DATA_ATTR float gpsSpeed = 0;
RTC_DATA_ATTR float lastGpsLat = 0;
RTC_DATA_ATTR float lastGpsLon = 0;

// OBD configs
ELM327 myELM327;
RTC_DATA_ATTR int obdSOC = 0;
RTC_DATA_ATTR int obdSOH = 0;
RTC_DATA_ATTR float obdMinV = 0;
RTC_DATA_ATTR float obdMaxV = 0;
RTC_DATA_ATTR int obdMinVNo = 0;
RTC_DATA_ATTR int obdMaxVNo = 0;
RTC_DATA_ATTR float obdSpeed = 0;
RTC_DATA_ATTR bool obdRead = false;
RTC_DATA_ATTR String obdGear = "";
RTC_DATA_ATTR String obdChargingType = "";
RTC_DATA_ATTR float obdChargingCurrent = 0;
RTC_DATA_ATTR float obdChargingVoltage = 0;
RTC_DATA_ATTR float obdChargingPower = 0;
RTC_DATA_ATTR float obdAux = 0;
bool canReportAux = false;
RTC_DATA_ATTR float obdAuxVcu = 0;
RTC_DATA_ATTR bool obdAuxFirstRead = false;
bool obdConnected = false;
String pids = "";
String pid2101 = "";
String pid2105 = "";

// Counters
int loopCounter = 0;
RTC_DATA_ATTR int bootCounter = 0;
RTC_DATA_ATTR int noLocationChangedCounter = 0;

bool isMeasureOK()
{
    return obdRead && obdSOH > 0;
}

bool isIgnited()
{

    return obdRead && obdGear != "";
}

bool isCellRead()
{
    return obdRead && obdMinV > 0 && obdMaxV > 0;
}

bool isCharging()
{
    return obdRead && (obdChargingType == "DC" || obdChargingType == "AC");
}

long getSpeed()
{
    if (isIgnited())
    {
        return obdSpeed;
    }

    return 0;
}

void setLowEnergy(bool forceSleep = false, bool deep = false)
{
    if (ttgo->bl->isOn() || forceSleep)
    {
        // If the backlighting is active >> switches to light sleep mode. The ESP32 Core remains active
        if (!DEBUG)
        {
            debug("Sleep: activating light sleep");
            ttgo->closeBL();
            ttgo->displaySleep();
        }
        canSleep = false;
        delay(50);

        power->clearIRQ();

        if (DEEP_SLEEP && deep)
        {
            debug("Sleep: activating deep sleep");
            canDeepSleep = false;
            esp_sleep_enable_ext0_wakeup((gpio_num_t)AXP202_INT, LOW);
            esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP_60s * uS_TO_S_FACTOR);
            esp_deep_sleep_start();
        }
    }
    else if (!forceSleep)
    {
        canSleep = false;
        canDeepSleep = false;
        loopCounter = 0;
        // setCpuFrequencyMhz(160);
        debug("Sleep: waking up");
        ttgo->displayWakeup();
        ttgo->openBL();
        ttgo->rtc->syncToSystem();
        delay(100);
    }
}

void checkIRQ()
{
    if (canSleep)
    {
        setLowEnergy(true, canDeepSleep);
    }
    else if (irq_axp202)
    {
        debug("IRQ: detected");
        irq_axp202 = false;
        power->readIRQ();
        if (power->isPEKShortPressIRQ())
        {
            debug("IRQ: Power button pressed");
            setLowEnergy();
        }
        power->clearIRQ();
    }
}

int getBackground()
{
    return !DEBUG ? TFT_BLACK : TFT_DARKGREY;
}

bool exitMessage(String message)
{
    if (exitMessageShown)
    {
        return false;
    }

    exitMessageShown = true;

    int16_t w = tft->width();
    int16_t x = tft->getCursorX();
    int16_t y = tft->getCursorY();
    int16_t h = tft->fontHeight();
    if (y + h + 10 > tft->height())
    {
        tft->setCursor(0, 35);
        y = 35;
    }

    tft->fillRect(0, y, w, h, getBackground());
    tft->setTextColor(TFT_RED);
    tft->setCursor(x + 5, y + 5);
    tft->print("Exit");
    String msg = message == "" ? "" : "[" + message + "]";
    w = tft->width() - tft->textWidth(msg);
    tft->fillRect(w - 5, y, w, h + 20, getBackground());
    tft->setCursor(w - 5, y + 5);
    tft->print(msg);
    tft->println();
    x = tft->getCursorX();
    y = tft->getCursorY();
    tft->setCursor(x, y + 5);

    debug("Exit: ", msg);
    checkIRQ();

    return true;
}

bool isLocationValid()
{
    if (TEST || DEBUG || INVALID_LOCATION_ALLOWED)
    {
        return true;
    }

    if (gpsLat <= 0 || gpsLon <= 0)
    {

        exitMessage("no valid location");
        return false;
    }

    return true;
}

long getTimeout()
{
    if (DEBUG || DEBUG_TIMEOUT)
    {
        return TIME_TO_SLEEP_10s;
    }

    if (!isLocationValid())
    {
        return TIME_TO_SLEEP_10s;
    }

    return getSpeed() != 0 || obdGear == "D" || obdGear == "R" ? TIME_TO_SLEEP_30s : TIME_TO_SLEEP_60s;
}

int clockMillis = -15000L;
void clockLoop()
{
    if (modem.isGprsConnected() && millis() - clockMillis > 15000L)
    {
        int x = tft->getCursorX();
        int y = tft->getCursorY();
        clockMillis = millis();
        String time = modem.getGSMDateTime(DATE_TIME);
        String hour = getValue(time, ":", 0);
        String minute = getValue(time, ":", 1);
        String displayTime = hour + ":" + minute;
        int16_t w = tft->textWidth(displayTime);
        tft->fillRect(0, 0, w + 5, 35, TFT_WHITE);
        tft->setCursor(5, 10);
        tft->setTextSize(1);
        tft->setTextColor(TFT_BLUE);

        tft->print(displayTime);

        tft->setCursor(x, y);
        tft->setTextSize(1);
    }
}

bool message(String label, String message = "", bool isError = false)
{
    int16_t w = tft->width();
    int16_t x = tft->getCursorX();
    int16_t y = tft->getCursorY();
    int16_t h = tft->fontHeight();
    if (y + h > tft->height())
    {
        tft->setCursor(0, 35);
        y = 35;
    }

    tft->fillRect(0, y, w, h, getBackground());
    tft->setTextColor(TFT_YELLOW);
    tft->setCursor(x + 5, y);
    tft->print(label);
    String msg = message == "" ? "" : "[" + message + "]";
    w = tft->width() - tft->textWidth(msg);
    tft->fillRect(w - 5, y, w, h, getBackground());
    tft->setCursor(w - 5, y);
    if (isError)
    {
        tft->setTextColor(TFT_RED);
    }
    else
    {
        tft->setTextColor(TFT_WHITE);
    }
    tft->print(msg);
    tft->println();

    debug(label, msg);
    checkIRQ();

    return true;
}

bool message(
    String label, bool (*func)(), unsigned long timeout = 10000L, void (*errorCallback)() = []() {}, String errorStr = "Failed", String successStr = "Success")
{
    clockLoop();

    int8_t ret = 0;
    unsigned long startMillis = millis();
    unsigned long sec;
    String strSec;
    int16_t w = tft->width();
    int16_t x = tft->getCursorX();
    int16_t y = tft->getCursorY();
    int16_t h = tft->fontHeight();
    int16_t vw = tft->width() - tft->textWidth("[" + String(timeout / 1000) + "s]");
    if (y + h > tft->height())
    {
        tft->setCursor(x + 5, 35);
        y = 35;
    }

    tft->setCursor(x + 5, y);
    tft->fillRect(0, y, w, h * 2, getBackground());
    tft->setTextColor(TFT_YELLOW);
    tft->print(label);
    do
    {
        checkIRQ();
        ret = func() ? 1 : 0;
        if (!ret)
        {
            sec = (timeout + 1000 - (millis() - startMillis)) / 1000;
            if ((millis() - startMillis) >= timeout)
            {
                ret = -1;
            }
            else
            {
                strSec = "[" + String(sec) + "s]";
                w = tft->width() - tft->textWidth(strSec);
                tft->fillRect(vw - 5, y, vw + 10, h, getBackground());
                tft->setCursor(w - 5, y);
                tft->setTextColor(TFT_WHITE);
                tft->print(strSec);
                delay(1000);
            }
        }
    } while (ret == 0);

    if (ret <= 0)
    {
        strSec = "[" + errorStr + "]";
        tft->setTextColor(TFT_RED);
    }
    else
    {
        strSec = "[" + successStr + "]";
        tft->setTextColor(TFT_GREEN);
    }
    w = tft->width() - tft->textWidth(strSec);
    tft->fillRect(w - 5, y, w, h, getBackground());
    tft->setCursor(w - 5, y);
    tft->print(strSec);
    tft->println();

    if (ret <= 0)
    {
        errorCallback();
    }
    debug("Message: " + label, strSec);

    return ret > 0;
}

String getTime()
{
    return modem.getGSMDateTime(DATE_FULL);
}

void showTitle()
{
    const char *title = "Ioniq";

    tft->setTextFont(2);
    tft->setTextSize(2);
    tft->setTextColor(TFT_BLUE);
    tft->fillRect(0, 0, tft->width(), 35, TFT_WHITE);
    int w = tft->textWidth(title);
    tft->setCursor(tft->width() / 2 - w / 2 + 5, 0);
    tft->println(F(title));
    tft->setTextSize(1);
}

bool isWakenUpByButton()
{

    return ESP_SLEEP_WAKEUP_EXT0 == esp_sleep_get_wakeup_cause();
}

void setupModem()
{
    bool inited = message(
        "Modem initialization", []() -> bool
        { return modem.isGprsConnected() || modem.isNetworkConnected() || modem.init(); },
        10000,
        []()
        {
            message("Modem restart");
            modem.restart();
        });

    if (!inited)
    {
        return;
    }

    message(
        "SIM status", []() -> bool
        {
            if (!simUnlocked && strlen(SIM_PIN) && modem.getSimStatus() != 3)
            {
                debug("SIM: unlocking");
                modem.simUnlock(SIM_PIN);
                delay(1000);
                simUnlocked = true;
                return false;
            }
            else
            {
                return true;
            }
        },
        10000, []() {}, "PIN required", "Unlocked");
}

void setupBluetooth()
{

    bool inited = message(
        "OBDLink connection", []() -> bool
        {
            debug("Bluetooth: check");
            if (TEST)
            {
                obdConnected = true;
                return true;
            }
            if (!obdConnected)
            {
                debug("Bluetooth: need to connect");
                ELM_PORT.setPin("0000");
                ELM_PORT.begin("Ioniq tracker", true);

                delay(1000);

                if (!ELM_PORT.connect(ELM_ADDRESS))
                {
                    debug("Bluetooth: connection failed");
                    return false;
                }

                debug("Bluetooth: connection success");
                return true;
            }
            else
            {
                debug("Bluetooth: already connected");
                return true;
            }
        },
        10000, []() {}, "Not connected", "Connected");

    if (!inited)
    {
        return;
    }

    message(
        "OBDLink initialization", []() -> bool
        {
            if (!obdConnected && !myELM327.begin(ELM_PORT, false, 2000, '6', 511))
            {
                debug("Bluetooth: initialization failed");
                obdConnected = false;
                return false;
            }

            if (!TEST)
            {
                myELM327.sendCommand("AT H1");
            }
            obdConnected = true;
            return true;
        });
}

String read_rawdata()
{
    debug("Payload: received");
    String rawData = "";
    debug("Payload: size ", myELM327.recBytes);
    for (int i = 0; i < myELM327.recBytes; i++)
    {
        rawData.concat(myELM327.payload[i]);
        Serial.print(myELM327.payload[i]); // Serial print OBD Rawdata
    }
    debug();
    return rawData;
}

void setup()
{
    WiFi.mode(WIFI_OFF);

    // Set console baud rate
    Serial.begin(115200);
    delay(10);

    // Get Watch object and set up the display
    ttgo = TTGOClass::getWatch();
    ttgo->begin();

    if (DEBUG || bootCounter == 0 || isWakenUpByButton())
    {
        bootCounter = 0;
        ttgo->openBL();
        ttgo->displayWakeup();
    }
    ++bootCounter;

    power = ttgo->power;
    tft = ttgo->tft;

    showTitle();

    // Initialize the serial port used by the modem
    SerialAT.begin(115200, SERIAL_8N1, SIM868_MODEM_RX, SIM868_MODEM_TX);

    // Interrupt that allows you to lightly sleep or wake up the screen
    pinMode(AXP202_INT, INPUT);
    attachInterrupt(
        AXP202_INT, []
        { irq_axp202 = true; },
        FALLING);
    power->enableIRQ(AXP202_PEK_SHORTPRESS_IRQ | AXP202_VBUS_REMOVED_IRQ | AXP202_VBUS_CONNECT_IRQ | AXP202_CHARGING_IRQ, true);
    power->clearIRQ();

    tft->setCursor(0, 35);
    tft->setTextColor(TFT_YELLOW);
    tft->fillRect(0, 35, tft->width(), tft->height(), getBackground());

    clockLoop();
    setupModem();
    setupBluetooth();
    delay(2000);
}

void batteryLoop()
{
    if (millis() - batteryMillis > 120000L)
    {
        int x = tft->getCursorX();
        int y = tft->getCursorY();
        batteryPercent = power->getBattPercentage();
        String displayPerc = String(batteryPercent) + "%";
        int16_t w = tft->width() - tft->textWidth(displayPerc);
        int16_t wr = tft->width() - tft->textWidth("100%");
        tft->fillRect(wr - 10, 0, wr + 5, 35, TFT_WHITE);
        tft->setCursor(w - 5, 10);
        tft->setTextSize(1);

        if (batteryPercent > 30)
        {
            tft->setTextColor(TFT_BLUE);
        }
        else if (batteryPercent > 15)
        {
            tft->setTextColor(TFT_ORANGE);
        }
        else
        {
            tft->setTextColor(TFT_RED);
        }

        tft->print(displayPerc);

        tft->setCursor(x, y);
        tft->setTextSize(1);
    }
}

bool isAuxReportTime()
{
    if (!obdAuxFirstRead)
    {
        obdAuxFirstRead = true;
        return true;
    }
    String currentTime = modem.getGSMDateTime(DATE_TIME);
    String currentMinutes = currentTime.substring(3, 5);
    if (currentMinutes == "00" || currentMinutes == "15" || currentMinutes == "30" || currentMinutes == "45")
    {
        return true;
    }

    return false;
}

bool isLocationChanged(bool canIncrease = false)
{
    debug("Location: Lat", getLongCoord(gpsLat));
    debug("Location: Last Lat", getLongCoord(lastGpsLat));
    debug("Location: Lon", getLongCoord(gpsLon));
    debug("Location: Last Lon", getLongCoord(lastGpsLon));
    bool isChanged = !areCoordsEquals(gpsLat, lastGpsLat) || !areCoordsEquals(gpsLon, lastGpsLon);

    debug("Location: no location changed count", noLocationChangedCounter);
    if (!isChanged && !DEBUG_LOCATION)
    {
        debug("Location: no changed");
        if (noLocationChangedCounter <= 0)
        {
            debug("Location: allowing no changed first");
            noLocationChangedCounter = canIncrease ? noLocationChangedCounter + 1 : noLocationChangedCounter;

            return true;
        }

        exitMessage("Location: exiting");
        return false;
    }

    noLocationChangedCounter = 0;

    return true;
}

void measureLoop()
{
    canReportAux = isAuxReportTime();
    if (!TEST && (!isLocationValid() || !obdConnected) && !canReportAux)
    {
        return;
    }

    message("Read PID 2105", []() -> bool
            {
                if (TEST)
                {
                    // SOC 90%
                    pid2105 = "7EB037F21127EA037F21127EC102D6105FFFFFFFF7ED037F21127EE037F21127EC2100000000000E0E7EC220F0D0D0E0F21377EC23264800015000007EC2403E84003E811B47EC25002900000000007EC2600000000000000";

                    // Turned off car soc 81%
                    pid2105 = "7EA037F21127EC102D6105FFFFFFFF7EB037F21127ED037F21127EE037F21127EC21000000000015147EC22161213151426487EC23264800016400007EC2403E84003E811A37EC25002900000000007EC2600000000000000";

                    return true;
                }

                if (!obdConnected)
                {
                    return false;
                }

                // myELM327.sendCommand("AT SH 7E4");

                if (obdConnected && myELM327.queryPID("2105"))
                {
                    pid2105 = read_rawdata();
                    // debug("PID 2105", pid2105);

                    if (pid2105.indexOf("6105"))
                    {
                        return true;
                    }
                }
                return false;
            });

    delay(1000);
    message("Read PID 2101", []() -> bool
            {
                if (TEST)
                {
                    // D 29.08km/h
                    pid2101 = "7EB101E6101000003FF7EA10166101FFE000007EC103D6101FFFFFFFF7ED10336101FFFFFBC07EE037F21127EB218C3C002E986D367EA210928594F0640037EC21AC2137264803FE7ED21000357033103D77EB220010040A002F027EA2200009C04A470347EC22D90F3A0F0D0F0F7ED22000090003501BC7EB233D0490366DDA457EA23040800000000007EC230D0D0E000ECB1C7ED23057B41000000007EB24194D0C000000007EC24CA3800008900037ED24000000006000007EC2509EB0003072E007ED25000001F30000037EC26011A460001102C7ED26340000000000007EC2700B1E0ED0D01867ED27057B00000000007EC28044C044C03E800";

                    // Turned off car aux 12.9v
                    pid2101 = "7ED10336101FFFFFBC07EA10166101FFE000007EC103D6101FFFFFFFF7EB101E6101000003FF7EE037F21127ED210098DB958559A07EA210921103D063B037EC219C26482648A3FF7EB2108380149950A337ED22046E9E024700BB7EA2200000000B069007EC22950EED161214157EB220000000A001E027ED23050F43102000C87EA23072000000000007EC231312160010C7127EB233B0401333000307ED24078C014C7600197EC24C63800008100037EB24009FFF000000007ED25001501F4958F627EC2512AD00031033007ED26D20013003203E77EC26011D7E0001135C7ED27051F01000000007EC2700B3515C09017E7EC280000000003E800";

                    return true;
                }

                if (!obdConnected)
                {
                    return false;
                }

                // myELM327.sendCommand("AT SH 7E2");

                if (myELM327.queryPID("2101"))
                {
                    pid2101 = read_rawdata();
                    // debug("PID 2101", pid2101);

                    if (pid2101.indexOf("6101"))
                    {
                        return true;
                    }
                }
                return false;
            });
    // message("Read PID 1A80, 22C00B, 2180", []() -> bool
    //         {
    //             if (!obdConnected)
    //             {
    //                 return false;
    //             }

    //             myELM327.sendCommand("AT SH 7E2");
    //             myELM327.sendCommand("AT CRA 7EA");
    //             String vin = "";
    //             String temp = "";
    //             String tpms = "";
    //             // vin
    //             if (myELM327.queryPID("1A80"))
    //             {
    //                 vin = read_rawdata();
    //             }

    //             myELM327.sendCommand("AT SH 7E6");
    //             myELM327.sendCommand("AT CRA 7EE");
    //             // temp
    //             if (myELM327.queryPID("2180"))
    //             {
    //                 temp = read_rawdata();
    //             }

    //             myELM327.sendCommand("AT SH 7A0");
    //             myELM327.sendCommand("AT CRA 7A8");
    //             // tpms
    //             if (myELM327.queryPID("22C00B"))
    //             {
    //                 tpms = read_rawdata();
    //             }

    //             if (tpms != "" || vin != "" || temp != "")
    //             {
    //                 pids = vin + "|" + tpms + "|" + temp;
    //                 debug("Pids", pids);
    //                 return true;
    //             }

    //             return false;
    //         });

    String readData = "";
    getPidValue("soc", pid2105, readData);
    obdSOC = readData.toInt();
    getPidValue("soh", pid2105, readData);
    obdSOH = readData.toInt();
    getPidValue("gear", pid2101, obdGear);
    getPidValue("minCellVoltage", pid2101, readData);
    obdMinV = readData.toFloat();
    getPidValue("minCellVoltageNo", pid2101, readData);
    obdMinVNo = readData.toInt();
    getPidValue("maxCellVoltage", pid2101, readData);
    obdMaxV = readData.toFloat();
    getPidValue("maxCellVoltageNo", pid2101, readData);
    obdMaxVNo = readData.toInt();
    getPidValue("speed", pid2101, readData);
    obdSpeed = readData.toFloat();
    getPidValue("chargingType", pid2101, obdChargingType);
    getPidValue("chargingCurrent", pid2101, readData);
    obdChargingCurrent = readData.toFloat();
    getPidValue("chargingVoltage", pid2101, readData);
    obdChargingVoltage = readData.toFloat();
    getPidValue("chargingPower", pid2101, readData);
    obdChargingPower = readData.toFloat();
    getPidValue("auxiliary", pid2101, readData);
    obdAux = readData.toFloat();

    if (obdAux < 10)
    {
        message("Read voltage", []() -> bool
                {
                    if (TEST)
                    {
                        obdAuxVcu = 12.222;

                        return true;
                    }

                    if (!obdConnected)
                    {
                        return false;
                    }

                    myELM327.sendCommand("ATRV");
                    obdAuxVcu = read_rawdata().toFloat() / 10;

                    if (obdAuxVcu < 9 || obdAuxVcu > 15)
                    {
                        obdAuxVcu = 0;
                        return false;
                    }
                    return true;
                });
    }

    obdRead = true;

    // debug("PID 2105", pid2105);
    // debug("PID 2101", pid2101);

    message("VCU", String(obdAuxVcu) + "V, " + String(obdGear) + ", " + String(obdSpeed) + "km/h");
    if (isCharging())
    {
        message("BMS Charging", obdChargingType + ", " + String(obdChargingVoltage) + "V");
        message("            ", String(obdChargingCurrent) + "A, " + String(obdChargingPower / 1000) + "kW");
    }
    message("BMS SOH, SOC, AUX", String(obdSOH) + "%, " + String(obdSOC) + "%, " + String(obdAux) + "V");
    message("Min Cell voltage", "Cell " + String(obdMinVNo) + String(": ") + obdMinV + "V");
    message("Max Cell voltage", "Cell " + String(obdMaxVNo) + String(": ") + obdMaxV + "V");
}

void simLoop()
{
    if (loopCounter > 0)
    {
        setupModem();
    }
}

void obdLoop()
{
    if (!myELM327.connected)
    {
        debug("ELM: not connected ");
        obdConnected = false;
    }
    if (loopCounter > 0)
    {
        setupBluetooth();
    }
}

void networkLoop()
{
    if ((obdAuxVcu <= 0 || obdAux <= 0) && !canReportAux)
    {
        if (!isLocationValid() || (!isCharging() && !isLocationChanged()))
        {
            return;
        }
    }

    message("Network initialization", []() -> bool
            { return simUnlocked && (modem.isNetworkConnected() || modem.waitForNetwork(1000)); });

    message(
        "Network status", []() -> bool
        { return modem.isNetworkConnected(); },
        10000, []() {}, "Not connected", "Connected");

    message(
        "GRPS initialization", []() -> bool
        { return simUnlocked && (modem.isGprsConnected() || modem.gprsConnect(APN, GPRS_USER, GPRS_PASS)); });

    message(
        "GRPS status", []() -> bool
        { return modem.isGprsConnected(); },
        10000, []() {}, "Not connected", "Connected");
}

void clientLoop()
{
    bool isLocChanged = isLocationChanged(true);
    if ((obdAuxVcu <= 0 || obdAux <= 0) && !canReportAux)
    {
        if (!isLocationValid() || (!isCharging() && !isLocChanged))
        {
            return;
        }
    }

    lastGpsLat = gpsLat;
    lastGpsLon = gpsLon;

    message(
        "Connect to client", []() -> bool
        {
            if (!simUnlocked || !modem.isGprsConnected() || !client.connect(SERVER, PORT))
            {
                return false;
            }
            return true;
        },
        15000L);
    message(
        "Sending data", []() -> bool
        {
            String requestStr = String("GET ") + PATH +
                                "?Authorization=" + urlencode("Bearer SpyWatch") +
                                "&save[time]=" + urlencode(getTime()) +
                                "&save[field][operator]=" + urlencode(modem.getOperator()) +
                                "&save[field][battery]=" +
                                "&save[field][speed]=" + getSpeed();

            // if (pids != "")
            // {
            //     requestStr = requestStr + "&save[field][pids]=" + pids;
            // }
            // if (pid2105 != "")
            // {
            //     requestStr = requestStr + "&save[field][pid2105]=" + pid2105;
            // }
            // if (pid2101 != "")
            // {
            //     requestStr = requestStr + "&save[field][pid2101]=" + pid2101;
            // }

            if (isLocationValid())
            {
                requestStr = requestStr + "&save[field][latitude]=" + getLongCoord(gpsLat);
                requestStr = requestStr + "&save[field][longitude]=" + getLongCoord(gpsLon);
            }

            if (isCharging())
            {
                requestStr = requestStr + "&save[field][chargingType]=" + obdChargingType;
                requestStr = requestStr + "&save[field][chargingPower]=" + obdChargingPower;
            }

            if (isIgnited())
            {
                requestStr = requestStr + "&save[field][gear]=" + obdGear;
            }
            if (isMeasureOK())
            {
                requestStr = requestStr + "&save[field][minVoltage]=" + obdMinV;
                requestStr = requestStr + "&save[field][minVoltageNo]=" + obdMinVNo;
                requestStr = requestStr + "&save[field][maxVoltage]=" + obdMaxV;
                requestStr = requestStr + "&save[field][maxVoltageNo]=" + obdMaxVNo;
                requestStr = requestStr + "&save[field][soh]=" + obdSOH;
                requestStr = requestStr + "&save[field][soc]=" + obdSOC;
            }

            if (obdAux > 0)
            {
                requestStr = requestStr + "&save[field][aux]=" + obdAux;
            }
            else if (obdAuxVcu > 0)
            {
                requestStr = requestStr + "&save[field][aux]=" + obdAuxVcu;
            }

            requestStr = requestStr + "&save[field][carId]=" + CAR_ID;

            requestStr = requestStr + " HTTP/1.1\r\n";
            debug("Send request", requestStr);

            if (AVOID_SENDING)
            {
                return true;
            }

            client.print(requestStr);
            client.print(String("Host: ") + SERVER + "\r\n");
            client.print("Connection: close\r\n\r\n");
            client.println();
            String str = "Connecting to " + String(SERVER);
            unsigned long timeout = millis();
            while (client.connected() && millis() - timeout < 30000L)
            {
                // Print available data
                while (client.available())
                {
                    char c = client.read();
                    str += c;
                    // debug(c);
                    timeout = millis();
                }
            }
            if (millis() - timeout > 30000L)
            {
                client.stop();
                return false;
            }
            else
            {
                client.stop();
                return true;
            }
        },
        30000L);
}

void gpsLoop()
{
    message(
        "GPS initialization", []() -> bool
        {
            if (!gpsEnabled)
            {
                debug("GPS: enabling");

                ttgo->enableModemGPSPower();

                // Turn on SIM868 GPIO1, which is responsible for enabling the SIM868 GPS chip
                modem.sendAT("+CGPIO=0,57,1,1");
                modem.waitResponse();
            }

            delay(1000);

            if (gpsEnabled || modem.enableGPS())
            {
                gpsEnabled = true;

                modem.getGPS(&gpsLat, &gpsLon, &gpsSpeed); //, &gpsAlt, &gpsVsat, &gpsUsat, &gpsAccuracy);

                if (TEST || DEBUG_LOCATION || INVALID_LOCATION_ALLOWED)
                {
                    gpsLat = 47.8179054260253888;
                    gpsLon = 18.8781318664550781;
                    gpsSpeed = 120;
                }

                debug("Location: Lat", gpsLat);
                debug("Location: Lon", gpsLon);

                if (gpsLat > 0 && gpsLon > 0)
                {
                    return true;
                }
            }

            return false;
        },
        10000L);

    message("GPS data", String(gpsSpeed) + " km/h, " + String(gpsLat) + ", " + String(gpsLon));
}

void resetData()
{
    canReportAux = false;
    gpsSpeed = 0;
    obdSpeed = 0;
    obdGear = "";
    obdSOC = 0;
    obdRead = false;
    obdAux = 0;
    obdAuxVcu = 0;
}

void loop()
{
    resetData();

    exitMessageShown = false;
    batteryLoop();

    if (loopCounter > 0)
    {
        tft->setCursor(0, 35);
        tft->setTextColor(TFT_YELLOW);
        tft->fillRect(0, 35, tft->width(), tft->height(), getBackground());
    }

    simLoop();
    obdLoop();
    gpsLoop();
    measureLoop();
    networkLoop();
    clientLoop();

    loopCounter++;
    debug("Boot count: ", bootCounter);
    debug("Loop count:", loopCounter);

    if (loopCounter > 2 || bootCounter > 1)
    {
        canSleep = true;

        if (DEEP_SLEEP && loopCounter > 8 && getSpeed() == 0)
        {
            canDeepSleep = true;
        }
    }

    if (canDeepSleep)
    {
        // Go to deep sleep
        message("Next request", "60s");
        delay(1000);
    }
    else
    {
        message(
            "Next request", []() -> bool
            { return false; },
            getTimeout() * 1000, []() {}, "Reload");
    }
}