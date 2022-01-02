// Hardware
#define LILYGO_WATCH_2019_WITH_TOUCH
#define LILYGO_WATCH_HAS_SIM868
#define LILYGO_WATCH_HAS_GPS
#define LILYGO_WATCH_HAS_BUTTON

// Set serial for debug console (to the Serial Monitor, default speed 115200)
#define SerialMon Serial
// Set serial for AT commands (to the module)
#define SerialAT Serial1

// Configure TinyGSM library
#define TINY_GSM_MODEM_SIM868   // Modem is SIM868
#define TINY_GSM_RX_BUFFER 1024 // Set RX buffer to 1Kb

// Define the serial console for debug prints, if needed
#define TINY_GSM_DEBUG SerialMon

#define uS_TO_S_FACTOR 1000000ULL /* Conversion factor for micro seconds to seconds */
#define TIME_TO_SLEEP_60s 60      /* Time ESP32 will go to sleep (in seconds) */
#define TIME_TO_SLEEP_30s 30      /* Time ESP32 will go to sleep (in seconds) */
#define TIME_TO_SLEEP_10s 10      /* Time ESP32 will go to sleep (in seconds) */

#define DEBUG false
#define DEEP_SLEEP true
#define TEST false
#define PRINTLN_ALLOWED false
#define INVALID_LOCATION_ALLOWED false
#define DEBUG_TIMEOUT false
#define DEBUG_LOCATION false
#define AVOID_SENDING false

#include <LilyGoWatch.h>
#include <TinyGsmClient.h>