/**
 * Photographic Weather App Logic - Local Computer Assets Engine
 * Architecture Scope: Open-Meteo High-Availability API Implementation
 */

const appState = {
  rawPayload: null,
  isCelsiusSystem: true,
  queryLocation: 'Calgary'
};

const weatherBackground = {
  sunny: {
    imagePath: "./images/sunny.png",  
    icon: "ep:sunny",                    
    towerColorClass: "text-amber-950/40",
    textLabel: "Sunny"
  },
  rainy: {
    imagePath: "./images/rainy.png",
    icon: "famicons:rainy-outline",         
    towerColorClass: "text-indigo-950/50",
    textLabel: "Rain"
  },
  cloudy: {
    imagePath: "./images/cloudy.png",
    icon: "carbon:mostly-cloudy",                        
    towerColorClass: "text-slate-900/50",
    textLabel: "Cloudy"
  },
  snowy: {
    imagePath: "./images/snowy.png",
    icon: "material-symbols-light:weather-snowy-outline",                         
    towerColorClass: "text-blue-950/40",
    textLabel: "Snow"
  },
  default: {
    imagePath: "./images/tower.png",
    icon: "akar-icons:cloud",                    
    towerColorClass: "text-slate-950/40",
    textLabel: "Cloudy"
  }
};


/**
 * Open-Meteo WMO Weather Code Interpreter Dictionary
 * Utilizes JavaScript Switch statements to route numeric tracking codes cleanly
 */
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
  const normText = conditionText.toLowerCase();
  
  if (normText.includes('sunny') || normText.includes('clear')) return 'sunny';
  if (normText.includes('rain') || normText.includes('drizzle') || normText.includes('shower') || normText.includes('thunderstorm')) return 'rainy';
  if (normText.includes('cloudy') || normText.includes('overcast') || normText.includes('mist') || normText.includes('fog')) return 'cloudy';
  if (normText.includes('snow') || normText.includes('flurry') || normText.includes('ice') || normText.includes('sleet')) return 'snowy';
  
  return 'default';
}

function assignWeatherSymbol(conditionText) {
  const activeKey = getThemeKey(conditionText);
  return weatherBackground[activeKey].icon;
}

function applyThematicInterfaceStyles(conditionText) {
  const cardElement = document.getElementById('weather-card');
  const towerGraphics = document.getElementById('tower-element');
  
  const activeKey = getThemeKey(conditionText);
  const activeTheme = weatherBackground[activeKey];
  
  // Inject local custom paths cleanly into standard inline style rules
  cardElement.style.backgroundImage = `url('${activeTheme.imagePath}')`;
  towerGraphics.className = `tower-bg ${activeTheme.towerColorClass}`;

  // Clean wildcard regex replacement sits safely inside the styling loop context block
  cardElement.className = cardElement.className.replace(/bg-gradient\S+|from-\S+|to-\S+|bg-\[\S+\]/g, '').trim();
}

function evaluateScaleMetric(celsiusRawVal, appendUnitSymbol = true) {
  const cleanInteger = parseInt(celsiusRawVal, 10);
  const processedValue = appState.isCelsiusSystem ? cleanInteger : Math.round((cleanInteger * 9) / 5 + 32);
  return appendUnitSymbol ? `${processedValue}°` : processedValue;
}

function transformToDayName(dateString) {
  const formatReference = new Date(dateString + 'T00:00:00');
  return formatReference.toLocaleDateString('en-CA', { 
    weekday: 'long', 
    timeZone: 'America/Edmonton' 
  });
}

async function triggerWeatherSyncFetch(locationTarget) {
  const latitude = 51.0447;
  const longitude = -114.0719;
  
  const apiEndpointUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FEdmonton`;
  const DOMErrorBox = document.getElementById('error-message');
  
  try {
    DOMErrorBox.classList.add('hidden');
    const responseStream = await fetch(apiEndpointUrl);
    if (!responseStream.ok) throw new Error(`Handshake failure: ${responseStream.status}`);
    
    appState.rawPayload = await responseStream.json();
    executeDOMWidgetRender();
  } catch (err) {
    console.error("API error tracing:", err);
    DOMErrorBox.classList.remove('hidden');
    document.getElementById('location-heading').innerText = 'Data Offline';
  }
}

function executeDOMWidgetRender() {
  const dataEngine = appState.rawPayload;
  if (!dataEngine) return;

  // 1. Assign Local City Strings Anchor Nodes
  document.getElementById('location-heading').innerText = "Calgary, Alberta";

  // 2. Process Current Conditions Data Core Properties
  const currentConditionText = interpretWmoCode(dataEngine.current.weather_code);
  applyThematicInterfaceStyles(currentConditionText);
  
  document.getElementById('current-condition').innerText = currentConditionText;
  document.getElementById('current-temp').innerText = evaluateScaleMetric(dataEngine.current.temperature_2m);
  
const iconTargetNodeContainer = document.getElementById('current-icon-container');
iconTargetNodeContainer.innerHTML = `
<iconify-icon 
    icon="${assignWeatherSymbol(currentConditionText)}"
    class="text-[100px] text-white">
  </iconify-icon>
`;

  const mainTodayCardItem = document.getElementById('weather-card');
  mainTodayCardItem.classList.remove('opacity-0', 'scale-95');

  // 3. Process 3-Day Layout Matrix Tracks using required array methods (.filter and .map)
  const DOMGridRootContainer = document.getElementById('forecast-grid');
  DOMGridRootContainer.innerHTML = '';

  const dailyTimeline = dataEngine.daily.time; 

  // Filter downward systematically to explicitly lock exactly 3 tracking day fields
  const structuralThreeDaySegment = dailyTimeline.filter((_, calendarIndex) => calendarIndex < 3);

  // Transform dataset arrays securely using .map blueprints arrays mutations
  const generatedDOMCardCollection = structuralThreeDaySegment.map((dateString, runtimeIndex) => {
    const dayWmoCode = dataEngine.daily.weather_code[runtimeIndex];
    const specificDayWeatherText = interpretWmoCode(dayWmoCode);
    
    const maxTempC = dataEngine.daily.temperature_2m_max[runtimeIndex];

    const dynamicHTMLCardNode = document.createElement('div');
    dynamicHTMLCardNode.className = "flex justify-between items-center text-sm font-semibold text-white/95 py-1.5 drop-shadow";
    dynamicHTMLCardNode.innerHTML = `
      <span class="w-1/3 text-left tracking-wide">${transformToDayName(dateString)}</span>
      <span class="w-1/3 text-center capitalize text-xs tracking-wider text-white/80 font-normal">${specificDayWeatherText}</span>
      <span class="w-1/3 text-right tracking-tighter">${evaluateScaleMetric(maxTempC)}</span>
    `;

    return dynamicHTMLCardNode;
  });

  generatedDOMCardCollection.forEach(compiledDOMNode => {
    DOMGridRootContainer.appendChild(compiledDOMNode);
  });
}

document.getElementById('unit-toggle').addEventListener('click', () => {
  appState.isCelsiusSystem = !appState.isCelsiusSystem;
  document.getElementById('unit-toggle').innerHTML = `<span>Switch to &deg;${appState.isCelsiusSystem ? 'F' : 'C'}</span>`;
  executeDOMWidgetRender();
});

document.addEventListener('DOMContentLoaded', () => {
  triggerWeatherSyncFetch(appState.queryLocation);
});
