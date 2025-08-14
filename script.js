// API Key para OpenWeather
const API_KEY = '38e63c3a0501533e79c57e789ae2b52d';
const CITY = 'Asuncion,PY';

// Elementos DOM
const weatherControls = document.querySelectorAll('.weather-controls button');
const weatherCardsContainer = document.getElementById('weatherCards');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const agriculturalNotes = document.getElementById('agriculturalNotes');
const saveNotesBtn = document.getElementById('saveNotes');

// Gráficos
let tempChart, humidityChart, precipitationChart, pressureChart;

// Días seleccionados actualmente
let selectedDays = 5;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Cargar notas guardadas de localStorage
    if(localStorage.getItem('agriculturalNotes')) {
        agriculturalNotes.value = localStorage.getItem('agriculturalNotes');
    }
    
    // Obtener datos climáticos iniciales
    fetchWeatherData(selectedDays);
    
    // Configurar listeners de eventos
    setupEventListeners();
    
    // Inicializar gráficos con datos vacíos
    initializeCharts();
});

function setupEventListeners() {
    // Controles de periodo climático
    weatherControls.forEach(button => {
        button.addEventListener('click', function() {
            weatherControls.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedDays = parseInt(this.dataset.days);
            fetchWeatherData(selectedDays);
        });
    });
    
    // Alternar barra lateral
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    sidebarClose.addEventListener('click', function() {
        sidebar.classList.remove('active');
    });
    
    // Guardar notas
    saveNotesBtn.addEventListener('click', function() {
        localStorage.setItem('agriculturalNotes', agriculturalNotes.value);
        alert('Notas agrícolas guardadas correctamente');
    });
}

function fetchWeatherData(days) {
    // Primero obtener el clima actual
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric&lang=es`)
        .then(response => response.json())
        .then(currentData => {
            // Luego obtener el pronóstico
            fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${API_KEY}&units=metric&lang=es`)
                .then(response => response.json())
                .then(forecastData => {
                    // Procesar los datos
                    const processedData = processWeatherData(currentData, forecastData, days);
                    
                    // Actualizar UI
                    updateWeatherCards(processedData);
                    updateCharts(processedData);
                    updateRecommendations(processedData);
                })
                .catch(error => {
                    console.error('Error al obtener datos de pronóstico:', error);
                    // Datos simulados si la API falla
                    const simulatedData = simulateWeatherData(days);
                    updateWeatherCards(simulatedData);
                    updateCharts(simulatedData);
                    updateRecommendations(simulatedData);
                });
        })
        .catch(error => {
            console.error('Error al obtener clima actual:', error);
            // Datos simulados si la API falla
            const simulatedData = simulateWeatherData(days);
            updateWeatherCards(simulatedData);
            updateCharts(simulatedData);
            updateRecommendations(simulatedData);
        });
}

function processWeatherData(currentData, forecastData, days) {
    // Procesar datos de la API a nuestro formato
    const processedData = [];
    const now = new Date();
    
    // Agregar clima actual
    processedData.push({
        date: now,
        day: 'Hoy',
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        pressure: currentData.main.pressure,
        precipitation: currentData.rain ? currentData.rain['1h'] || 0 : 0,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon
    });
    
    // Procesar datos de pronóstico para los próximos 5 días
    if(forecastData && forecastData.list) {
        const dailyData = {};
        
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateStr = date.toLocaleDateString('es-PY');
            
            if(!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: date,
                    day: getDayName(date),
                    temps: [],
                    feels_like: [],
                    humidity: [],
                    pressure: [],
                    precipitation: 0,
                    descriptions: [],
                    icons: []
                };
            }
            
            dailyData[dateStr].temps.push(item.main.temp);
            dailyData[dateStr].feels_like.push(item.main.feels_like);
            dailyData[dateStr].humidity.push(item.main.humidity);
            dailyData[dateStr].pressure.push(item.main.pressure);
            
            if(item.rain && item.rain['3h']) {
                dailyData[dateStr].precipitation += item.rain['3h'];
            }
            
            dailyData[dateStr].descriptions.push(item.weather[0].description);
            dailyData[dateStr].icons.push(item.weather[0].icon);
        });
        
        // Calcular promedios y valores más comunes para cada día
        Object.keys(dailyData).forEach(dateStr => {
            const dayData = dailyData[dateStr];
            
            // Saltar hoy (ya agregado)
            if(dateStr === now.toLocaleDateString('es-PY')) return;
            
            // Solo agregar si estamos dentro de los días solicitados
            if(processedData.length < days) {
                processedData.push({
                    date: dayData.date,
                    day: dayData.day,
                    temp: average(dayData.temps),
                    feels_like: average(dayData.feels_like),
                    humidity: average(dayData.humidity),
                    pressure: average(dayData.pressure),
                    precipitation: dayData.precipitation,
                    description: getMostCommon(dayData.descriptions),
                    icon: getMostCommon(dayData.icons)
                });
            }
        });
    }
    
    // Si necesitamos más días de los que proporciona la API, simulamos
    if(days > processedData.length) {
        const remainingDays = days - processedData.length;
        const simulatedData = simulateAdditionalDays(remainingDays, processedData);
        processedData.push(...simulatedData);
    }
    
    return processedData;
}

function getMonthlyProfile(monthIndex) {
    // Perfil climático mensual para Asunción
    const profiles = [
        { month: 0,  name: 'Enero',   avgTemp: 27.5, minTemp: 22.0, maxTemp: 33.0, precipitation: 150, rainyDays: 8, humidity: 70 }, 
        { month: 1,  name: 'Febrero', avgTemp: 27.0, minTemp: 21.5, maxTemp: 32.5, precipitation: 130, rainyDays: 7, humidity: 70 },
        { month: 2,  name: 'Marzo',   avgTemp: 26.0, minTemp: 20.5, maxTemp: 31.5, precipitation: 120, rainyDays: 7, humidity: 70 },
        { month: 3,  name: 'Abril',   avgTemp: 23.0, minTemp: 18.0, maxTemp: 28.0, precipitation: 160, rainyDays: 8, humidity: 75 },
        { month: 4,  name: 'Mayo',    avgTemp: 20.0, minTemp: 15.0, maxTemp: 25.0, precipitation: 120, rainyDays: 7, humidity: 75 },
        { month: 5,  name: 'Junio',   avgTemp: 18.0, minTemp: 14.0, maxTemp: 22.0, precipitation: 100, rainyDays: 6, humidity: 75 },
        { month: 6,  name: 'Julio',   avgTemp: 17.5, minTemp: 13.0, maxTemp: 22.0, precipitation: 80,  rainyDays: 5, humidity: 70 },
        { month: 7,  name: 'Agosto',  avgTemp: 19.5, minTemp: 15.2, maxTemp: 25.1, precipitation: 72,  rainyDays: 5, humidity: 65 },
        { month: 8,  name: 'Septiembre', avgTemp: 21.5, minTemp: 17.0, maxTemp: 27.2, precipitation: 124, rainyDays: 7, humidity: 63 },
        { month: 9,  name: 'Octubre', avgTemp: 23.5, minTemp: 19.0, maxTemp: 29.0, precipitation: 150, rainyDays: 8, humidity: 65 },
        { month: 10, name: 'Noviembre', avgTemp: 25.0, minTemp: 20.0, maxTemp: 32.0, precipitation: 160, rainyDays: 9, humidity: 65 },
        { month: 11, name: 'Diciembre', avgTemp: 27.0, minTemp: 21.5, maxTemp: 32.5, precipitation: 140, rainyDays: 8, humidity: 68 }
    ];
    return profiles[monthIndex];
}

function simulateWeatherData(days) {
    // Generar datos climáticos simulados para demostración
    const simulatedData = [];
    const now = new Date();
    
    for(let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        const month = date.getMonth();
        const profile = getMonthlyProfile(month);
        
        // Variación diaria basada en perfil mensual
        const dailyTempVariation = (Math.random() - 0.5) * 6;
        const temp = profile.avgTemp + dailyTempVariation;
        
        // Simulación de precipitación
        const rainProbability = profile.rainyDays / 30.4;
        let precipitation = 0;
        if(Math.random() < rainProbability) {
            const avgPerRainyDay = profile.precipitation / profile.rainyDays;
            precipitation = (Math.random() * 0.5 + 0.75) * avgPerRainyDay;
        }
        
        // Simulación de humedad
        const humidity = profile.humidity + (Math.random() - 0.5) * 15;
        
        // Simulación de presión
        const pressure = 1012 + (Math.random() - 0.5) * 10;
        
        // Determinar descripción del clima
        let description, icon;
        if(precipitation > 10) {
            description = 'Lluvia intensa';
            icon = '10d';
        } else if(precipitation > 5) {
            description = 'Lluvia moderada';
            icon = '09d';
        } else if(precipitation > 0) {
            description = 'Lluvia ligera';
            icon = '09d';
        } else if(temp > 30) {
            description = 'Soleado';
            icon = '01d';
        } else if(temp > 25) {
            description = 'Parcialmente nublado';
            icon = '02d';
        } else {
            description = 'Nublado';
            icon = '03d';
        }
        
        simulatedData.push({
            date: date,
            day: i === 0 ? 'Hoy' : getDayName(date),
            temp: temp,
            feels_like: temp - (Math.random() * 3),
            humidity: humidity,
            pressure: pressure,
            precipitation: precipitation,
            description: description,
            icon: icon
        });
    }
    
    return simulatedData;
}

function simulateAdditionalDays(days, existingData) {
    // Simular días adicionales basados en patrones de datos existentes
    const simulatedData = [];
    const lastData = existingData[existingData.length - 1];
    
    for(let i = 0; i < days; i++) {
        const date = new Date(lastData.date);
        date.setDate(date.getDate() + i + 1);
        const month = date.getMonth();
        const profile = getMonthlyProfile(month);
        
        // Crear variación basada en perfil mensual
        const tempVariation = (Math.random() - 0.5) * 4;
        const temp = profile.avgTemp + tempVariation;
        
        // Variación de humedad
        const humidityVariation = (Math.random() - 0.5) * 15;
        const humidity = profile.humidity + humidityVariation;
        
        // Simulación de precipitación
        const rainProbability = profile.rainyDays / 30.4;
        let precipitation = 0;
        if(Math.random() < rainProbability) {
            const avgPerRainyDay = profile.precipitation / profile.rainyDays;
            precipitation = (Math.random() * 0.5 + 0.75) * avgPerRainyDay;
        }
        
        // Simulación de presión
        const pressure = 1012 + (Math.random() - 0.5) * 8;
        
        // Determinar descripción del clima
        let description, icon;
        if(precipitation > 10) {
            description = 'Lluvia intensa';
            icon = '10d';
        } else if(precipitation > 5) {
            description = 'Lluvia moderada';
            icon = '09d';
        } else if(precipitation > 0) {
            description = 'Lluvia ligera';
            icon = '09d';
        } else if(temp > 30) {
            description = 'Soleado';
            icon = '01d';
        } else if(temp > 25) {
            description = 'Parcialmente nublado';
            icon = '02d';
        } else {
            description = 'Nublado';
            icon = '03d';
        }
        
        simulatedData.push({
            date: date,
            day: getDayName(date),
            temp: temp,
            feels_like: temp - (Math.random() * 2),
            humidity: Math.max(40, Math.min(90, humidity)),
            pressure: pressure,
            precipitation: precipitation,
            description: description,
            icon: icon
        });
    }
    
    return simulatedData;
}

function createWeatherCard(day) {
    const card = document.createElement('div');
    card.className = 'weather-card';
    
    // Ícono del clima - usando íconos de OpenWeather
    const iconUrl = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;
    
    // Determinar si las condiciones son favorables para la agricultura
    const isFavorable = day.temp >= 18 && day.temp <= 28 && day.humidity >= 60 && day.humidity <= 80;
    const agroIndicator = isFavorable ? 
        '<div class="agro-indicator"><span class="dot favorable"></span><span>Condiciones favorables</span></div>' : 
        '<div class="agro-indicator"><span class="dot moderate"></span><span>Condiciones moderadas</span></div>';
    
    card.innerHTML = `
        <h3>${day.day}</h3>
        <p>${day.date.toLocaleDateString('es-PY')}</p>
        <img src="${iconUrl}" alt="${day.description}" style="width: 50px; height: 50px; margin: 10px 0;">
        <p class="value">${Math.round(day.temp)}°C</p>
        <p class="description">${capitalizeFirstLetter(day.description)}</p>
        <div style="margin-top: 15px;">
            <p><strong>Humedad:</strong> ${Math.round(day.humidity)}%</p>
            <p><strong>Precipitación:</strong> ${day.precipitation.toFixed(1)} mm</p>
            <p><strong>Presión:</strong> ${Math.round(day.pressure)} hPa</p>
        </div>
        ${agroIndicator}
    `;
    
    return card;
}

function updateWeatherCards(data) {
    weatherCardsContainer.innerHTML = '';
    
    // Aplicar clase especial solo para 5 días
    weatherCardsContainer.classList.toggle('five-days', selectedDays === 5);
    
    // Para 5 días, mostrar tarjetas individuales en fila
    if (selectedDays === 5) {
        data.forEach(day => {
            const card = createWeatherCard(day);
            weatherCardsContainer.appendChild(card);
        });
    } 
    // Para más de 5 días, agrupar por semanas
    else {
        // Agrupar por semanas (7 días por semana)
        const weeks = [];
        for (let i = 0; i < data.length; i += 7) {
            weeks.push(data.slice(i, i + 7));
        }
        
        weeks.forEach((week, weekIndex) => {
            const weekGroup = document.createElement('div');
            weekGroup.className = 'week-group';
            
            const weekHeader = document.createElement('div');
            weekHeader.className = 'week-header';
            weekHeader.innerHTML = `
                <div class="week-title">Semana ${weekIndex + 1}</div>
                <div class="week-arrow">▼</div>
            `;
            
            const weekDays = document.createElement('div');
            weekDays.className = 'week-days';
            
            week.forEach(day => {
                const card = createWeatherCard(day);
                weekDays.appendChild(card);
            });
            
            weekGroup.appendChild(weekHeader);
            weekGroup.appendChild(weekDays);
            weatherCardsContainer.appendChild(weekGroup);
            
            // Evento para expandir/colapsar la semana
            weekHeader.addEventListener('click', function() {
                const arrow = this.querySelector('.week-arrow');
                const isCollapsed = weekDays.classList.toggle('collapsed');
                arrow.textContent = isCollapsed ? '▲' : '▼';
            });
        });
    }
}

function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };
    
    // Gráfico de temperatura
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: chartOptions
    });
    
    // Gráfico de humedad
    const humidityCtx = document.getElementById('humidityChart').getContext('2d');
    humidityChart = new Chart(humidityCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: chartOptions
    });
    
    // Gráfico de precipitación
    const precipitationCtx = document.getElementById('precipitationChart').getContext('2d');
    precipitationChart = new Chart(precipitationCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: chartOptions
    });
    
    // Gráfico de presión
    const pressureCtx = document.getElementById('pressureChart').getContext('2d');
    pressureChart = new Chart(pressureCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: chartOptions
    });
}

function updateCharts(data) {
    const labels = data.map(day => day.day);
    const humidityData = data.map(day => day.humidity);
    const precipitationData = data.map(day => day.precipitation);
    const pressureData = data.map(day => day.pressure);
    const tempData = data.map(day => day.temp);
    const feelsLikeData = data.map(day => day.feels_like);
    
    // Actualizar gráfico de temperatura
    tempChart.data.labels = labels;
    tempChart.data.datasets = [
        {
            label: 'Temperatura',
            data: tempData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
        },
        {
            label: 'Sensación Térmica',
            data: feelsLikeData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1
        }
    ];
    tempChart.update();
    
    // Actualizar gráfico de humedad
    humidityChart.data.labels = labels;
    humidityChart.data.datasets = [
        {
            label: 'Humedad (%)',
            data: humidityData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
        }
    ];
    humidityChart.update();
    
    // Actualizar gráfico de precipitación
    precipitationChart.data.labels = labels;
    precipitationChart.data.datasets = [
        {
            label: 'Precipitación (mm)',
            data: precipitationData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }
    ];
    precipitationChart.update();
    
    // Actualizar gráfico de presión
    pressureChart.data.labels = labels;
    pressureChart.data.datasets = [
        {
            label: 'Presión (hPa)',
            data: pressureData,
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.1
        }
    ];
    pressureChart.update();
}

function updateRecommendations(data) {
    // Generar recomendaciones agrícolas basadas en datos climáticos
    const avgTemp = average(data.map(day => day.temp));
    const avgHumidity = average(data.map(day => day.humidity));
    const totalPrecip = data.reduce((sum, day) => sum + day.precipitation, 0);
    const month = data[0].date.getMonth();
    
    // Determinar estación
    let season, plantingPeriod;
    if(month >= 11 || month <= 1) {
        season = "verano";
        plantingPeriod = "principios de otoño (febrero-marzo)";
    } else if(month >= 2 && month <= 4) {
        season = "otoño";
        plantingPeriod = "invierno (mayo-julio)";
    } else if(month >= 5 && month <= 7) {
        season = "invierno";
        plantingPeriod = "primavera (agosto-septiembre)";
    } else {
        season = "primavera";
        plantingPeriod = "verano (octubre-diciembre)";
    }
    
    // Generar recomendaciones de cultivos
    let recommendedCrops = [];
    if(avgTemp > 25) {
        recommendedCrops.push("mandioca", "batata", "maíz", "poroto", "sandía", "melón");
    } else if(avgTemp > 18) {
        recommendedCrops.push("soja", "trigo", "canola", "cebolla", "zanahoria", "lechuga");
    } else {
        recommendedCrops.push("trigo", "avena", "cebada", "arveja", "col", "brócoli");
    }
    
    // Ajustar por precipitación
    if(totalPrecip/data.length > 5) {
        recommendedCrops = recommendedCrops.filter(crop => 
            !["cebolla", "zanahoria"].includes(crop));
        recommendedCrops.push("arroz", "camote");
    } else if(totalPrecip/data.length < 2) {
        recommendedCrops = recommendedCrops.filter(crop => 
            !["arroz", "sandía"].includes(crop));
    }
    
    // Generar advertencias de enfermedades
    let diseases = [];
    if(avgHumidity > 75) {
        diseases.push("roya", "tizón tardío", "mildiu");
    }
    if(avgTemp > 25 && avgHumidity > 70) {
        diseases.push("antracnosis", "bacteriosis");
    }
    if(avgTemp < 20 && avgHumidity > 80) {
        diseases.push("pie negro", "fusarium");
    }
    
    // Generar consejos de riego
    let irrigationTips = "";
    if(totalPrecip/data.length > 5) {
        irrigationTips = "Las lluvias son abundantes, puede reducir el riego. Asegúrese de buen drenaje para evitar encharcamientos.";
    } else if(totalPrecip/data.length > 2) {
        irrigationTips = "Las lluvias son suficientes para la mayoría de cultivos. Riegue solo en ausencia de lluvia por más de 3 días.";
    } else {
        irrigationTips = "Las condiciones son secas. Riegue regularmente, preferiblemente en las primeras horas de la mañana.";
    }
    
    // Actualizar DOM
    document.getElementById('recommendedCrops').textContent = 
        recommendedCrops.join(", ") + ". Buenas opciones para el " + season + " en Paraguay.";
    
    document.getElementById('plantingSeason').textContent = 
        "La próxima época ideal de siembra es " + plantingPeriod + 
        " basado en el clima actual y pronósticos.";
    
    document.getElementById('diseasesToWatch').textContent = 
        diseases.length > 0 ? 
        "Alta probabilidad de " + diseases.join(", ") + ". Monitorar cultivos y aplicar preventivos." : 
        "Bajo riesgo de enfermedades. Mantenga prácticas preventivas básicas.";
    
    document.getElementById('irrigationTips').textContent = irrigationTips;
}

// Funciones auxiliares
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getMostCommon(arr) {
    return arr.sort((a, b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}

function getDayName(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Almacenar datos climáticos actuales
let currentWeatherData = [];
