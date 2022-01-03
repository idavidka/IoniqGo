# Ioniq GO

Lilygo TTGO T-Watch software for reading OBDII data from Hyundai Ioniq EV 28 kWh with GPS location as well. Data can be published to any server via GSM. Simple tracking site attached in webapp directory.

## Needed Hardware

- [Lilygo TTGO T-Watch SIM868](http://www.lilygo.cn/prod_view.aspx?TypeId=50036&Id=1346&FId=t3:50036:3)
- [Bluetooth OBD scanner](https://www.amazon.com/s?k=bluetooth+obd2+scanner&sprefix=bluetooth+obd%2Caps%2C187&ref=nb_sb_ss_ts-doa-p_1_13)

NOTE: I am using [OBDLink MX+](https://www.obdlink.com/products/obdlink-mxp/)

## Setup of Web APP

### Requirements

- PHP 5 or higher version
- MySQL 8

### Install

- Upload [webapp](https://github.com/idavidka/IoniqGo/tree/main/webapp) directory to a web service.
- Create database from [webapp/database/tables.sql](https://github.com/idavidka/IoniqGo/blob/main/webapp/database/tables.sql) file.
- Setup your database config in [webapp/api/application/config/database.php](https://github.com/idavidka/IoniqGo/blob/main/webapp/api/application/config/database.php)

```
$db['default'] = array(
	'dsn'	=> '',
	'hostname' => '<MYSQL HOST>',
	'username' => '<MYSQL USERNAME>',
	'password' => '<MYSQL PASSWORD>',
	'database' => '<MYSQL DATABASE>',
	'dbdriver' => 'mysqli',
	'dbprefix' => '',
	'pconnect' => FALSE,
	'db_debug' => (ENVIRONMENT !== 'production'),
	'cache_on' => FALSE,
	'cachedir' => '',
	'char_set' => 'utf8',
	'dbcollat' => 'utf8_general_ci',
	'swap_pre' => '',
	'encrypt' => FALSE,
	'compress' => FALSE,
	'stricton' => FALSE,
	'failover' => array(),
	'save_queries' => TRUE
);
```

- If you would like to change any part of the code, feel free to contribute on my github or do it localy.

NOTE: If you change it localy, you need to run `npm run build` in [webapp/src](https://github.com/idavidka/IoniqGo/tree/main/webapp/src) directory once you have done and upload again.

## Setup of Lilygo TTGO T-Watch

### Install the software

If you are new to Arduino and Platform.io, you should get some information about them [here](https://platformio.org/install/ide?install=vscode).

If you are already familiar with them, let's start.

- Open the [carapp/src/settings.h](https://github.com/idavidka/IoniqGo/blob/main/carapp/src/settings.h) file and set the followings:

```
// User settings
#define APN "<YOUR INTERNET APN>"
#define GPRS_USER "<YOUR INTERNET USER>"
#define GPRS_PASS "<YOUR INTERNET PASSWORD>"
#define SIM_PIN "<PIN CODE OF YOUR SIM CARD>"

// Server settings
#define SERVER "<SERVER URL WHERE WEB APP RUNNING>"
#define PATH "/api/pull/20"
#define PORT 80

// Bluetooth settings
uint8_t ELM_ADDRESS[6] = <YOUR ELM DEVICE ID AS A HEX ARRAY> // {0x00, 0x04, 0x3E, 0x5D, 0xE5, 0xC2};

#define CAR_ID = "<YOUR CAR ID>" // TODO: replace with VIN number
```

- Compile and upload to connected Lilygo TTGO T-Watch

NOTE: If you are on MacOS, you must install driver for lilygo chipset. You can find it in [carapp](https://github.com/idavidka/IoniqGo/tree/main/carapp/drivers) directory.

## [BONUS] Monitor

One of the caveats of using the existing 12V plugs is that those are only powered when the car engine is on, meaning that it's not possible to monitor the status of the battery while the car is charging or at all as well.

### When charging

To be able to monitor the battery while the car is charging and not drain the 12V battery I've added a [new 12V plug](https://www.amazon.com/Converter-Reduced-Voltage-Regulator-Interface/dp/B08P8CSJZB/ref=sr_1_18_sspa) that takes the power from the fuse box that it's ONLY active when the car engine is on or the car is charging.

You can use the following fuse (IG3 2) to achieve this:
![Fuse box](https://raw.githubusercontent.com/idavidka/IoniqGo/main/carapp/ig3.jpg)

### At all

To be able to monitor the battery while at all and not drain the 12V battery I've added a [new 12V plug](https://www.amazon.com/Converter-Reduced-Voltage-Regulator-Interface/dp/B08P8CSJZB/ref=sr_1_18_sspa) that takes the power from the fuse box.

You can use the following fuse (Trunk) to achieve this:
![Fuse box](https://raw.githubusercontent.com/idavidka/IoniqGo/main/carapp/trunk.jpg)

In order to make them easy to take the power from the fuse box I've used the following [adaptor](https://www.aliexpress.com/item/4000127647948.html?spm=a2g0s.9042311.0.0.2ae863c0a3Juau).

## Credits

Thanks for inspiring me to:

- [OBD-PIDs-for-HKMC-EVs](https://github.com/JejuSoul/OBD-PIDs-for-HKMC-EVs)
- [OBDSOL](https://www.obdsol.com/)
- [Pioniq](https://github.com/hokus15/pioniq)
- [Goingelectric.de](https://www.goingelectric.de/forum/)
- And Tibor Zsorda

## Informal disclaimer

Before you download and use this software consider this: Any car is a possibly lethal piece of machinery and you might hurt or kill yourself or others using it, or even paying attention to the displays instead of watching the road. Be extremely prudent!

By even downloading this software, or the source code provided on GitHub, you agree to have completely understood this.

## Disclaimer

IONIQ GO (“THE SOFTWARE”) IS PROVIDED AS IS. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHOR MAKE NO WARRANTIES AS TO PERFORMANCE OR FITNESS FOR A PARTICULAR PURPOSE, OR ANY OTHER WARRANTIES WHETHER EXPRESSED OR IMPLIED. NO ORAL OR WRITTEN COMMUNICATION FROM OR INFORMATION PROVIDED BY THE AUTHORS SHALL CREATE A WARRANTY. UNDER NO CIRCUMSTANCES SHALL THE AUTHORS BE LIABLE FOR DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES RESULTING FROM THE USE, MISUSE, OR INABILITY TO USE THE SOFTWARE, EVEN IF THE AUTHOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THESE EXCLUSIONS AND LIMITATIONS MAY NOT APPLY IN ALL JURISDICTIONS. YOU MAY HAVE ADDITIONAL RIGHTS AND SOME OF THESE LIMITATIONS MAY NOT APPLY TO YOU. THIS SOFTWARE IS ONLY INTENDED FOR SCIENTIFIC USAGE.
