let isBrowserEnvironment = typeof window !== "undefined" &&
    typeof document !== "undefined";
if (!isBrowserEnvironment) {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="location-heading"></div>
        <div id="current-temp"></div>
        <div id="current-condition"></div>
        <div id="unit-toggle"></div>
        <div id="error-message" class="hidden"></div>
        <div id="current-icon-container"></div>
        <div id="weather-card" class="opacity-0 scale-95">
          <div id="forecast-grid"></div>
          <div id="tower-element"></div>
        </div>
      </body>
    </html>
  `);
    Object.assign(globalThis, {
        window: dom.window,
        document: dom.window.document
    });
    globalThis.document = dom.window.document;
}
const appState = {
    rawPayload: null,
    isCelsiusSystem: true,
    queryLocation: "Calgary",
};
const weatherBackground = {
    sunny: {
        imagePath: "./images/sunny.png",
        icon: "ep:sunny",
        towerColorClass: "text-amber-950/40",
        textLabel: "Sunny",
    },
    rainy: {
        imagePath: "./images/rainy.png",
        icon: "famicons:rainy-outline",
        towerColorClass: "text-indigo-950/50",
        textLabel: "Rain",
    },
    cloudy: {
        imagePath: "./images/cloudy.png",
        icon: "carbon:mostly-cloudy",
        towerColorClass: "text-slate-900/50",
        textLabel: "Cloudy",
    },
    snowy: {
        imagePath: "./images/snowy.png",
        icon: "material-symbols-light:weather-snowy-outline",
        towerColorClass: "text-blue-950/40",
        textLabel: "Snow",
    },
    default: {
        imagePath: "./images/tower.png",
        icon: "akar-icons:cloud",
        towerColorClass: "text-slate-950/40",
        textLabel: "Cloudy",
    },
};
function interpretWmoCode(code) {
    switch (code) {
        case 0:
        case 1:
            return "Sunny";
        case 2:
            return "Partly Cloudy";
        case 3:
            return "Cloudy";
        case 45:
        case 48:
            return "Mist";
        case 51:
        case 53:
        case 55:
        case 61:
        case 63:
        case 65:
        case 80:
        case 81:
        case 82:
            return "Rain";
        case 71:
        case 73:
        case 75:
        case 77:
        case 85:
        case 86:
            return "Snow";
        case 95:
        case 96:
        case 97:
            return "Thunderstorm";
        default:
            return "Cloudy";
    }
}
function getThemeKey(conditionText) {
    const normalized = conditionText.toLowerCase();
    if (normalized.includes("sunny") || normalized.includes("clear")) {
        return "sunny";
    }
    if (normalized.includes("rain") ||
        normalized.includes("drizzle") ||
        normalized.includes("shower") ||
        normalized.includes("thunderstorm")) {
        return "rainy";
    }
    if (normalized.includes("cloudy") ||
        normalized.includes("overcast") ||
        normalized.includes("mist") ||
        normalized.includes("fog")) {
        return "cloudy";
    }
    if (normalized.includes("snow") ||
        normalized.includes("flurry") ||
        normalized.includes("ice") ||
        normalized.includes("sleet")) {
        return "snowy";
    }
    return "default";
}
function assignWeatherSymbol(conditionText) {
    return weatherBackground[getThemeKey(conditionText)].icon;
}
function applyThematicInterfaceStyles(conditionText) {
    const cardElement = document.getElementById("weather-card");
    const towerGraphics = document.getElementById("tower-element");
    if (!cardElement || !towerGraphics) {
        return;
    }
    const activeTheme = weatherBackground[getThemeKey(conditionText)];
    cardElement.style.backgroundImage = `url('${activeTheme.imagePath}')`;
    towerGraphics.className = `tower-bg ${activeTheme.towerColorClass}`;
    cardElement.className = cardElement.className
        .replace(/bg-gradient\S+|from-\S+|to-\S+|bg-\[\S+\]/g, "")
        .trim();
}
function evaluateScaleMetric(celsiusRawVal, appendUnitSymbol = true) {
    const numericValue = typeof celsiusRawVal === "number"
        ? celsiusRawVal
        : Number.parseFloat(celsiusRawVal);
    if (Number.isNaN(numericValue)) {
        return appendUnitSymbol ? "0°" : 0;
    }
    const processedValue = appState.isCelsiusSystem
        ? Math.round(numericValue)
        : Math.round((numericValue * 9) / 5 + 32);
    return appendUnitSymbol
        ? `${processedValue}°`
        : processedValue;
}
function transformToDayName(dateString) {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-CA", {
        weekday: "long",
        timeZone: "America/Edmonton",
    });
}
async function triggerWeatherSyncFetch(locationTarget) {
    const resolvedLocation = locationTarget.trim() || appState.queryLocation;
    appState.queryLocation = resolvedLocation;
    const latitude = 51.0447;
    const longitude = -114.0719;
    const apiEndpointUrl = `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=America%2FEdmonton`;
    const errorBox = document.getElementById("error-message");
    try {
        errorBox?.classList.add("hidden");
        const response = await fetch(apiEndpointUrl);
        if (!response.ok) {
            throw new Error(`Handshake failure: ${response.status}`);
        }
        appState.rawPayload =
            (await response.json());
        executeDOMWidgetRender();
    }
    catch (error) {
        console.error("API error tracing:", error);
        errorBox?.classList.remove("hidden");
        const locationHeading = document.getElementById("location-heading");
        if (locationHeading) {
            locationHeading.innerText = "Data Offline";
        }
    }
}
function executeDOMWidgetRender() {
    const dataEngine = appState.rawPayload;
    if (!dataEngine) {
        return;
    }
    const locationHeading = document.getElementById("location-heading");
    const locationName = appState.queryLocation.trim() || "Calgary";
    if (locationHeading) {
        locationHeading.innerText =
            `${locationName}, Alberta`;
    }
    const currentCondition = interpretWmoCode(dataEngine.current.weather_code);
    applyThematicInterfaceStyles(currentCondition);
    const currentConditionNode = document.getElementById("current-condition");
    if (currentConditionNode) {
        currentConditionNode.innerText = currentCondition;
    }
    const currentTempNode = document.getElementById("current-temp");
    if (currentTempNode) {
        currentTempNode.innerText = String(evaluateScaleMetric(dataEngine.current.temperature_2m));
    }
    const iconContainer = document.getElementById("current-icon-container");
    if (iconContainer) {
        iconContainer.innerHTML = `
      <iconify-icon
        icon="${assignWeatherSymbol(currentCondition)}"
        class="text-[100px] text-white">
      </iconify-icon>
    `;
    }
    document
        .getElementById("weather-card")
        ?.classList.remove("opacity-0", "scale-95");
    const forecastGrid = document.getElementById("forecast-grid");
    if (!forecastGrid) {
        return;
    }
    forecastGrid.innerHTML = "";
    const firstThreeDays = dataEngine.daily.time.slice(0, 3);
    firstThreeDays.forEach((dateString, index) => {
        const weatherCode = dataEngine.daily.weather_code[index] ?? 0;
        const weatherText = interpretWmoCode(weatherCode);
        const maxTemp = dataEngine.daily.temperature_2m_max[index] ?? 0;
        const card = document.createElement("div");
        card.className =
            "flex justify-between items-center text-sm font-semibold text-white/95 py-1.5 drop-shadow";
        card.innerHTML = `
      <span class="w-1/3 text-left tracking-wide">
        ${transformToDayName(dateString)}
      </span>
      <span class="w-1/3 text-center capitalize text-xs tracking-wider text-white/80 font-normal">
        ${weatherText}
      </span>
      <span class="w-1/3 text-right tracking-tighter">
        ${evaluateScaleMetric(maxTemp)}
      </span>
    `;
        forecastGrid.appendChild(card);
    });
}
const unitToggleButton = document.getElementById("unit-toggle");
if (unitToggleButton) {
    unitToggleButton.addEventListener("click", () => {
        appState.isCelsiusSystem =
            !appState.isCelsiusSystem;
        unitToggleButton.innerHTML = `
        <span>
          Switch to °${appState.isCelsiusSystem ? "F" : "C"}
        </span>
      `;
        executeDOMWidgetRender();
    });
}
void triggerWeatherSyncFetch(appState.queryLocation);
async function runTerminalApp() {
    try {
        await triggerWeatherSyncFetch("Calgary");
        console.log("\n=== LIVE WEATHER APP TERMINAL VIEW ===");
        console.log("Location:", document.getElementById("location-heading")?.innerText);
        console.log("Condition:", document.getElementById("current-condition")?.innerText);
        console.log("Temperature:", document.getElementById("current-temp")?.innerText);
        console.log("======================================\n");
    }
    catch (error) {
        console.error("Terminal initialization failed:", error);
    }
}
void runTerminalApp();
export {};
//# sourceMappingURL=app.js.map