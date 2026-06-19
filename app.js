// State
let userData = {};
let wellnessCoins = 150;
let waterCount = 0;
let waterGoal = 8; // dynamic based on weather
let token = localStorage.getItem('aura_token') || null;
let isLoginMode = true;
const BASE_URL = (window.location.protocol === 'file:' || !window.location.host) 
    ? 'http://localhost:3000' 
    : '';

// DOM Elements
const onboardingForm = document.getElementById('onboarding-form');
const onboardingScreen = document.getElementById('onboarding-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const chatbotModal = document.getElementById('chatbot-modal');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chatInput');

// Auth Screen Elements
const authScreen = document.getElementById('auth-screen');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authTitle = document.getElementById('auth-title');
const authDesc = document.getElementById('auth-desc');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleMsg = document.getElementById('authToggleMsg');

// Profile Pic preview
document.getElementById('userProfilePic').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('userProfilePic').dataset.base64 = event.target.result;
            document.querySelector('.file-upload-label').innerHTML = '<i class="fa-solid fa-check"></i> Photo Selected';
        };
        reader.readAsDataURL(file);
    }
});

// Detect Location
function detectLocation() {
    const locInput = document.getElementById('userLocation');
    locInput.placeholder = "Detecting...";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
                .then(res => res.json())
                .then(data => {
                    locInput.value = data.city + ", " + data.countryName;
                    userData.lat = lat;
                    userData.lon = lon;
                })
                .catch(() => {
                    locInput.value = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
                    userData.lat = lat;
                    userData.lon = lon;
                });
            },
            () => { locInput.placeholder = "Location access denied"; }
        );
    }
}

// Auth screen toggle mode
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = "Welcome to Aura.";
        authDesc.textContent = "Login to continue your wellness journey.";
        authSubmitBtn.innerHTML = 'Log In <i class="fa-solid fa-right-to-bracket"></i>';
        authToggleMsg.innerHTML = `Don't have an account? <span style="color:var(--primary); font-weight:bold;">Sign Up</span>`;
    } else {
        authTitle.textContent = "Create Account.";
        authDesc.textContent = "Start your holistic wellness journey today.";
        authSubmitBtn.innerHTML = 'Sign Up <i class="fa-solid fa-user-plus"></i>';
        authToggleMsg.innerHTML = `Already have an account? <span style="color:var(--primary); font-weight:bold;">Log In</span>`;
    }
}

// Show/Hide Screens
function showAuth() {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    authScreen.classList.remove('hidden');
    setTimeout(() => authScreen.classList.add('active'), 50);
    document.getElementById('main-nav').classList.add('hidden');
}

function showOnboarding() {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    onboardingScreen.classList.remove('hidden');
    setTimeout(() => onboardingScreen.classList.add('active'), 50);
    document.getElementById('main-nav').classList.add('hidden');
}

async function loadUserProfile() {
    if (!token) return false;
    try {
        const res = await fetch(`${BASE_URL}/api/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            userData = await res.json();
            localStorage.setItem('aura_user', JSON.stringify(userData));
            return true;
        }
    } catch (err) {
        console.error("Error loading user profile:", err);
    }
    return false;
}

async function loadUserProgress() {
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/api/progress`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const progress = await res.json();
            wellnessCoins = progress.coins;
            waterCount = progress.water_count;
            waterGoal = progress.water_goal;
        }
    } catch (err) {
        console.error("Error loading user progress:", err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    toggleCycleInputs();
    
    if (token) {
        const hasProfile = await loadUserProfile();
        if (hasProfile) {
            await loadUserProgress();
            showDashboard();
        } else {
            showOnboarding();
        }
    } else {
        showAuth();
    }
});

// Auth form submit handler
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const endpoint = isLoginMode ? `${BASE_URL}/api/auth/login` : `${BASE_URL}/api/auth/signup`;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (!res.ok) {
            alert(data.error || 'Authentication failed.');
            return;
        }

        token = data.token;
        localStorage.setItem('aura_token', token);

        if (isLoginMode) {
            if (data.hasProfile) {
                await loadUserProfile();
                await loadUserProgress();
                showDashboard();
            } else {
                showOnboarding();
            }
        } else {
            showOnboarding();
        }
    } catch (err) {
        console.error(err);
        alert('Server communication error.');
    }
});

// Onboarding Form Submit
function toggleCycleInputs() {
    const gender = document.getElementById('userGender').value;
    const cycleInputs = document.getElementById('female-cycle-inputs');
    if (cycleInputs) {
        if (gender === 'female') {
            cycleInputs.classList.remove('hidden');
        } else {
            cycleInputs.classList.add('hidden');
        }
    }
}

onboardingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    userData = {
        name: document.getElementById('userName').value,
        location: document.getElementById('userLocation').value,
        lat: userData.lat || null,
        lon: userData.lon || null,
        profilePic: document.getElementById('userProfilePic').dataset.base64 || null,
        gender: document.getElementById('userGender').value,
        lastPeriodDate: document.getElementById('lastPeriodDate').value,
        cycleLength: document.getElementById('cycleLength').value || 28,
        age: document.getElementById('userAge').value,
        weight: document.getElementById('userWeight').value + ' ' + document.getElementById('weightUnit').value,
        height: document.getElementById('userHeight').value + ' ' + document.getElementById('heightUnit').value,
        goal: document.getElementById('userGoal').value,
        skinType: document.getElementById('userSkin').value,
        hairType: document.getElementById('userHair').value
    };

    try {
        const response = await fetch(`${BASE_URL}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        if (response.ok) {
            localStorage.setItem('aura_user', JSON.stringify(userData));
            showDashboard();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to save profile.');
        }
    } catch (err) {
        console.error(err);
        alert('Server communication error.');
    }
});

function showDashboard() {
    onboardingScreen.classList.remove('active');
    authScreen.classList.remove('active');
    onboardingScreen.classList.add('hidden');
    authScreen.classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('main-nav').classList.remove('hidden');
        switchScreen('dashboard');
        
        // Setup dashboard data
        const firstName = userData.name.split(' ')[0];
        document.getElementById('greet-user').textContent = `Hi, ${firstName}`;
        document.getElementById('coin-display').textContent = wellnessCoins + " Coins";

        // Setup Avatar
        if (userData.profilePic) {
            const navAvatar = document.getElementById('nav-avatar');
            navAvatar.innerHTML = `<img src="${userData.profilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }

        // Display Location
        document.getElementById('loc-display').textContent = userData.location || "Unknown Location";

        // Fetch Weather and Update Skin/Hair care
        if (userData.lat && userData.lon) {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userData.lat}&longitude=${userData.lon}&current_weather=true`)
            .then(res => res.json())
            .then(data => {
                const temp = data.current_weather.temperature;
                const isDay = data.current_weather.is_day;
                
                document.getElementById('temp-display').textContent = `${temp}°C`;
                window.currentTemp = temp;

                // Skin Care Logic
                let skinTip = "";
                let skinBadge = "Normal";
                let hairTip = "";

                if (temp > 30) {
                    skinBadge = "Hot Weather";
                    waterGoal = 10;
                    if (userData.skinType === 'oily') {
                        skinTip = "High heat increases sebum. Use a foaming cleanser, oil-free SPF 50, and a mattifying moisturizer.";
                    } else if (userData.skinType === 'dry') {
                        skinTip = "Hot air dehydrates you. Use a hydrating serum under SPF 50. Drink lots of water.";
                    } else {
                        skinTip = "High UV risk! Apply SPF 50 sunscreen. Keep skin hydrated with a light gel.";
                    }
                    
                    if (userData.hairType === 'oily') {
                        hairTip = "Sweat causes oily buildup. Wash with a clarifying shampoo and use UV protectant serum.";
                    } else if (userData.hairType === 'dry') {
                        hairTip = "Sun can fry dry hair. Apply leave-in conditioner and tie your hair up outside.";
                    } else {
                        hairTip = "Protect your scalp from the sun. Wear a hat and use a mild shampoo.";
                    }
                } else if (temp < 15) {
                    skinBadge = "Cold Weather";
                    waterGoal = 8;
                    if (userData.skinType === 'oily') {
                        skinTip = "Cold weather dries skin, but stick to a lightweight ceramide lotion, not heavy creams.";
                    } else if (userData.skinType === 'dry') {
                        skinTip = "Harsh cold! Use a rich barrier cream and a hydrating overnight mask. Avoid hot showers.";
                    } else {
                        skinTip = "Cold weather dries out skin. Use a heavy ceramide moisturizer.";
                    }
                    
                    if (userData.hairType === 'oily') {
                        hairTip = "Cold air causes dandruff. Use a scalp scrub and avoid washing too often.";
                    } else if (userData.hairType === 'dry') {
                        hairTip = "Cold air makes hair brittle. Use a deep conditioning mask and argan oil.";
                    } else {
                        hairTip = "Keep your hair covered from cold winds to prevent breakage.";
                    }
                } else {
                    skinBadge = "Pleasant";
                    waterGoal = 8;
                    if (userData.skinType === 'oily') {
                        skinTip = "Pleasant weather! A gentle salicylic acid wash and light moisturizer will keep you clear.";
                    } else if (userData.skinType === 'dry') {
                        skinTip = "Good weather! Don't skip your daily moisturizer to maintain hydration.";
                    } else {
                        skinTip = "Pleasant weather. A basic cleanser, toner, and moisturizer will do perfectly.";
                    }
                    
                    if (userData.hairType === 'oily') {
                        hairTip = "Natural oils balance well now. Standard shampoo routine is fine.";
                    } else if (userData.hairType === 'dry') {
                        hairTip = "Great weather for hair. Regular oiling twice a week will maintain shine.";
                    } else {
                        hairTip = "Great weather for hair. Regular routine is enough.";
                    }
                }
                
                if (userData.hairType === 'treated') {
                    hairTip += " (Always use color-safe sulfate-free shampoo).";
                }

                const st = document.getElementById('skin-tip');
                if (st) st.textContent = skinTip;
                const sb = document.getElementById('skin-weather-badge');
                if (sb) sb.textContent = skinBadge;
                const ht = document.getElementById('hair-tip');
                if (ht) ht.textContent = hairTip;
            })
            .catch(() => {
                document.getElementById('temp-display').textContent = `N/A`;
            });
        } else {
            document.getElementById('temp-display').textContent = `Enable Location`;
            const st = document.getElementById('skin-tip');
            if (st) st.textContent = "Please allow location access during onboarding for live tips.";
            const ht = document.getElementById('hair-tip');
            if (ht) ht.textContent = "Please allow location access during onboarding for live tips.";
        }
        
        // Goal based UI adjustment
        const targetBadge = document.getElementById('workout-target');
        if(userData.goal === 'lose') targetBadge.textContent = 'Fat Burn Focus';
        if(userData.goal === 'build') targetBadge.textContent = 'Muscle Gain';
        if(userData.goal === 'maintain') targetBadge.textContent = 'Endurance';

        // Sleep recommendation logic
        let ageNum = parseInt(userData.age) || 25;
        let sleepRec = "7 to 9 hours";
        if (ageNum < 18) sleepRec = "8 to 10 hours";
        else if (ageNum > 65) sleepRec = "7 to 8 hours";
        
        if (userData.goal === 'build') {
            sleepRec = "8 to 9 hours (Muscle recovery requires extra sleep!)";
        }
        document.getElementById('sleep-recommendation').textContent = `Based on your profile, you need ${sleepRec} of sleep.`;
        calculateSleep(); // Initial calculation

        // Cycle Tracker (Female only)
        if (userData.gender === 'female' && userData.lastPeriodDate) {
            document.getElementById('cycle-widget').classList.remove('hidden');
            
            const today = new Date();
            const lastPeriod = new Date(userData.lastPeriodDate);
            const diffTime = Math.abs(today - lastPeriod);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const cycleLen = parseInt(userData.cycleLength) || 28;
            const currentDay = (diffDays % cycleLen) + 1;
            
            let phase = ""; let tip = "";
            if (currentDay <= 5) {
                phase = "Menstrual Phase";
                tip = "Low energy. Focus on rest, hydration, and light stretching/yoga.";
            } else if (currentDay <= 13) {
                phase = "Follicular Phase";
                tip = "Energy is rising! Great time for cardio and learning new workouts.";
            } else if (currentDay <= 16) {
                phase = "Ovulation Phase";
                tip = "Peak energy! Push yourself with HIIT or heavy strength training.";
            } else {
                phase = "Luteal Phase";
                tip = "Energy dropping. Focus on steady-state cardio or Pilates.";
            }
            
            document.getElementById('cycle-widget').innerHTML = `
                <div class="widget-header"><h3><i class="fa-solid fa-venus"></i> Cycle Sync</h3></div>
                <div class="text-center mt-1">
                    <p class="text-sm">Day ${currentDay}: ${phase}</p>
                    <p class="text-sm mt-1" style="color:var(--primary); font-weight:bold;">${tip}</p>
                </div>
            `;
        } else {
            document.getElementById('cycle-widget').classList.add('hidden');
        }

        updateWaterUI();
        
    }, 400);
}

// Water Tracker Logic (Tamagotchi Style)
function drinkWater() {
    if (waterCount < waterGoal) {
        waterCount++;
        updateWaterUI();
        syncWaterCount();
    }
}

function removeWater() {
    if (waterCount > 0) {
        waterCount--;
        updateWaterUI();
        syncWaterCount();
    }
}

function updateWaterUI() {
    const percent = (waterCount / waterGoal) * 100;
    document.getElementById('water-fill').style.width = percent + '%';
    document.querySelector('.status-text').textContent = `${waterCount} / ${waterGoal} Glasses`;

    const plantIcon = document.getElementById('virtual-plant');
    if (waterCount <= 2) plantIcon.textContent = '🥀';
    else if (waterCount <= 5) plantIcon.textContent = '🌱';
    else if (waterCount < 8) plantIcon.textContent = '🌿';
    else plantIcon.textContent = '🌸';
}

// Chatbot Logic
function toggleChat() {
    chatbotModal.classList.toggle('hidden');
}

let chatHistory = [];

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Add User Message
    addMessage(text, 'user-msg');
    chatInput.value = '';
    
    // Auto-scroll
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add to history
    chatHistory.push({ role: 'user', content: text });
    
    // Show loading indicator
    const thinkingEl = addMessage("Thinking...", 'ai-msg thinking');
    
    try {
        const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: text,
                history: chatHistory.slice(-10)
            })
        });
        const data = await response.json();
        
        // Remove thinking message
        if (thinkingEl) thinkingEl.remove();
        
        if (response.ok) {
            addMessage(data.reply, 'ai-msg');
            chatHistory.push({ role: 'model', content: data.reply });
        } else {
            addMessage(data.error || "Sorry, I am facing an issue connecting. Try again.", 'ai-msg');
        }
    } catch (err) {
        console.error(err);
        if (thinkingEl) thinkingEl.remove();
        addMessage("Network error. Please check your connection.", 'ai-msg');
    }
}

function addMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
}

// Enter key for chat
chatInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Reset/Logout app
function resetApp() {
    if(confirm("Do you want to log out?")) {
        localStorage.removeItem('aura_token');
        localStorage.removeItem('aura_user');
        location.reload();
    }
}

// Modals Logic
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Spin Wheel Logic
let isSpinning = false;
function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    const wheel = document.getElementById('spin-wheel');
    const resultText = document.getElementById('spin-result');
    resultText.textContent = "";
    
    const deg = Math.floor(Math.random() * 1440) + 1440; 
    wheel.style.transform = `rotate(${deg}deg)`;
    
    setTimeout(() => {
        isSpinning = false;
        const rewards = [
            "Drink 1 Extra Glass of Water (+10 Coins)",
            "Do 10 Squats right now (+20 Coins)",
            "Take 5 deep breaths (+5 Coins)",
            "Eat an Apple today (+15 Coins)"
        ];
        const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
        resultText.innerHTML = `🎉 <b>You Got:</b><br>${randomReward}`;
        
        const coinMatch = randomReward.match(/\+(\d+)/);
        if (coinMatch) {
            const added = parseInt(coinMatch[1]);
            wellnessCoins += added;
            document.getElementById('coin-display').textContent = wellnessCoins + " Coins";
            syncCoins(added);
        }
    }, 3000);
}

// REAL AI Food Scanner Logic using TensorFlow.js MobileNet
let mobilenetModel = null;

async function analyzeFood(input) {
    if (!input.files[0]) return;
    const file = input.files[0];
    
    document.getElementById('foodPicLabel').innerHTML = '<i class="fa-solid fa-check"></i> Photo Selected';
    
    const resultsDiv = document.getElementById('scanner-results');
    const animDiv = document.getElementById('scanning-anim');
    const dataDiv = document.getElementById('food-analysis-data');
    
    resultsDiv.classList.remove('hidden');
    animDiv.classList.remove('hidden');
    dataDiv.classList.add('hidden');
    
    const imgTarget = document.getElementById('ml-img-target');
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        imgTarget.src = e.target.result;
        
        imgTarget.onload = async () => {
            if (!mobilenetModel) {
                animDiv.innerHTML = "<p>Loading TFJS AI Model... <br>(First time takes a few seconds)</p>";
                try {
                    mobilenetModel = await mobilenet.load();
                } catch(err) {
                    animDiv.innerHTML = "<p>Failed to load AI Model. Check internet connection.</p>";
                    return;
                }
            }
            
            try {
                animDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-2x"></i><p class="text-sm mt-1">AI Scanning image...</p>';
                const predictions = await mobilenetModel.classify(imgTarget);
                console.log("AI Predictions:", predictions);
                const topResult = predictions[0].className.toLowerCase();
                
                // Advanced Validation
                const nonFoodKeywords = ["car", "vehicle", "dog", "cat", "person", "laptop", "monitor", "phone", "desk", "building", "house", "shoe", "clothing", "face", "envelope", "web site"];
                const foodKeywords = ["food", "fruit", "vegetable", "meat", "dish", "plate", "cup", "burger", "pizza", "apple", "banana", "orange", "cake", "bread", "soup", "coffee", "salad", "noodle", "pasta", "ice cream", "strawberry"];
                
                let isFood = false;
                if (foodKeywords.some(kw => topResult.includes(kw))) {
                    isFood = true;
                } else if (!nonFoodKeywords.some(kw => topResult.includes(kw))) {
                    isFood = true; // Accept ambiguous things as food for UX 
                }
                
                animDiv.classList.add('hidden');
                dataDiv.classList.remove('hidden');
                
                if (!isFood) {
                    document.getElementById('food-name').textContent = `⚠️ Error: Detected ${topResult.split(',')[0]}`;
                    document.getElementById('food-cal').textContent = "---";
                    document.getElementById('food-health').textContent = "---";
                    document.getElementById('food-weather-tip').textContent = "No real food detected in this image. Please upload a clear picture of a meal.";
                    return;
                }
                
                // Realistic Database & Fallback
                const foodDatabase = {
                    'cheeseburger': { cal: 350, health: 3 },
                    'pizza': { cal: 285, health: 4 },
                    'hotdog': { cal: 290, health: 2 },
                    'apple': { cal: 95, health: 10 },
                    'banana': { cal: 105, health: 9 },
                    'strawberry': { cal: 32, health: 10 },
                    'orange': { cal: 45, health: 10 },
                    'broccoli': { cal: 50, health: 10 },
                    'french fries': { cal: 365, health: 2 },
                    'ice cream': { cal: 207, health: 3 },
                    'salad': { cal: 150, health: 9 },
                    'plate': { cal: 300, health: 6 },
                    'cup': { cal: 120, health: 5 }
                };
                
                let detectedName = topResult.split(',')[0];
                let cal = 0; let health = 0;
                
                let matched = Object.keys(foodDatabase).find(k => topResult.includes(k));
                if (matched) {
                    cal = foodDatabase[matched].cal;
                    health = foodDatabase[matched].health;
                } else {
                    cal = (detectedName.length * 27) % 500 + 100;
                    health = (detectedName.length % 6) + 4; 
                }
                
                document.getElementById('food-name').textContent = `Detected: ${detectedName.charAt(0).toUpperCase() + detectedName.slice(1)}`;
                document.getElementById('food-cal').textContent = `${cal} kcal`;
                document.getElementById('food-health').textContent = `${health}/10`;
                
                // Weather Logic
                const tempText = document.getElementById('temp-display').textContent;
                const temp = parseInt(tempText) || 25;
                let weatherTip = "";
                
                if (temp > 30) {
                    weatherTip = (health >= 7) ? "Perfect light food for this hot weather! Stay hydrated." : "Heavy food during hot days causes sluggishness. Drink lots of water!";
                } else if (temp < 15) {
                    weatherTip = (health >= 7) ? "Good choice! But add some warm protein since it's cold outside." : "High calories! Keeps you warm, but balance it with a workout.";
                } else {
                    weatherTip = "Enjoy your meal in this pleasant weather!";
                }
                document.getElementById('food-weather-tip').textContent = weatherTip;
                
            } catch (err) {
                animDiv.classList.add('hidden');
                alert("AI Analysis failed. Try again.");
            }
        };
    };
    reader.readAsDataURL(file);
}

const workouts = {
    'Belly Fat': [
        { name: "High Knees", duration: 30, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/06/High-Knee-Run.gif" },
        { name: "Crunches", duration: 30, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Crunch.gif" },
        { name: "Plank", duration: 45, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Plank.gif" }
    ],
    'Arms': [
        { name: "Pushups", duration: 45, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif" },
        { name: "Arm Circles", duration: 30, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Arm-Circles.gif" }
    ],
    'Legs': [
        { name: "Squats", duration: 45, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/SQUAT.gif" },
        { name: "Lunges", duration: 45, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lunge.gif" }
    ],
    'Full Body': [
        { name: "Jumping Jacks", duration: 45, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Jumping-Jacks.gif" },
        { name: "Burpees", duration: 45, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Burpee.gif" }
    ]
};

let exInterval;
function openExerciseModal() {
    document.getElementById('ex-selection').classList.remove('hidden');
    document.getElementById('ex-active').classList.add('hidden');
    openModal('exercise-modal');
}
function startExercise(target) {
    document.getElementById('ex-selection').classList.add('hidden');
    document.getElementById('ex-active').classList.remove('hidden');
    document.getElementById('ex-title').textContent = `Target: ${target}`;
    
    // Weather tips
    const temp = window.currentTemp || 25;
    if (temp > 30) {
        document.getElementById('ex-weather-tip').textContent = "🌡️ Hot Weather Alert: Stay indoors and hydrate between sets!";
    } else if (temp < 15) {
        document.getElementById('ex-weather-tip').textContent = "❄️ Cold Weather: Do a longer warm-up to prevent injuries.";
    } else {
        document.getElementById('ex-weather-tip').textContent = "🌤️ Perfect weather for a workout. Let's go!";
    }
    
    const routine = workouts[target] || workouts['Full Body'];
    let currentExIndex = 0;
    const timerDisplay = document.getElementById('ex-timer');
    
    function runNextExercise() {
        if (currentExIndex >= routine.length) {
            timerDisplay.textContent = "DONE!";
            document.getElementById('ex-gif').src = "https://cdn-icons-png.flaticon.com/512/190/190411.png"; // Trophy image
            document.getElementById('ex-step-name').textContent = "Workout Complete!";
            document.getElementById('ex-weather-tip').textContent = "";
            wellnessCoins += 50;
            document.getElementById('coin-display').textContent = wellnessCoins + " Coins";
            const acd = document.getElementById('analytics-coin-display');
            if (acd) acd.textContent = wellnessCoins;
            
            logWorkout(target);
            
            setTimeout(() => {
                alert(`Amazing Workout! +50 Wellness Coins earned.`);
                closeModal('exercise-modal');
            }, 500);
            return;
        }
        
        const ex = routine[currentExIndex];
        document.getElementById('ex-step-name').textContent = `Step ${currentExIndex+1}: ${ex.name}`;
        document.getElementById('ex-gif').src = ex.gif;
        
        let time = ex.duration;
        clearInterval(exInterval);
        exInterval = setInterval(() => {
            let m = Math.floor(time / 60);
            let s = time % 60;
            timerDisplay.textContent = `${m < 10 ? '0':''}${m}:${s < 10 ? '0':''}${s}`;
            
            if (time <= 0) {
                clearInterval(exInterval);
                currentExIndex++;
                runNextExercise();
            }
            time--;
        }, 1000);
    }
    
    runNextExercise();
}
function completeExercise() {
    clearInterval(exInterval);
    closeModal('exercise-modal');
}

// Spotify Logic
function updateSpotify() {
    const mood = document.getElementById('userMood').value;
    const link = document.getElementById('spotify-link');
    if (!mood) {
        link.classList.add('hidden');
        return;
    }
    
    link.classList.remove('hidden');
    if (mood === 'happy') link.href = "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC"; 
    if (mood === 'stressed') link.href = "https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u"; 
    if (mood === 'sad') link.href = "https://open.spotify.com/playlist/37i9dQZF1DX3YSRoSdA634"; 
    if (mood === 'sleepy') link.href = "https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7cq"; 
}

// Screen Switching Logic
function switchScreen(screenName) {
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('active');
    document.getElementById('analytics-screen').classList.add('hidden');
    document.getElementById('analytics-screen').classList.remove('active');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    if (screenName === 'dashboard') {
        document.getElementById('dashboard-screen').classList.remove('hidden');
        setTimeout(()=> document.getElementById('dashboard-screen').classList.add('active'), 50);
        document.querySelector('.nav-dashboard').classList.add('active');
    } else if (screenName === 'analytics') {
        document.getElementById('analytics-screen').classList.remove('hidden');
        setTimeout(()=> document.getElementById('analytics-screen').classList.add('active'), 50);
        document.querySelector('.nav-analytics').classList.add('active');
        document.getElementById('analytics-coin-display').textContent = wellnessCoins;
        loadAnalytics();
    }
}

// Sleep Calculator Logic
function calculateSleep() {
    const wakeTime = document.getElementById('wakeup-time').value;
    if (!wakeTime) return;
    
    const [hours, minutes] = wakeTime.split(':').map(Number);
    let wakeDate = new Date();
    wakeDate.setHours(hours, minutes, 0, 0);
    
    const formatTime = (date) => {
        let h = date.getHours();
        let m = date.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0'+m : m;
        return `${h}:${m} ${ampm}`;
    };

    const bedtimes = [];
    // 6 cycles, 5 cycles, 4 cycles
    [6, 5, 4].forEach(cycles => {
        let bedDate = new Date(wakeDate.getTime());
        bedDate.setMinutes(bedDate.getMinutes() - (cycles * 90) - 15); // 15 mins to fall asleep
        bedtimes.push(formatTime(bedDate));
    });
    
    const resultsContainer = document.getElementById('bedtime-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div title="Optimal (9 hours)"><span style="color:#86efac; font-size:1.2rem;">${bedtimes[0]}</span><br><small style="color:#cbd5e1;font-weight:normal;">6 Cycles</small></div>
            <div title="Good (7.5 hours)"><span style="color:#fcd34d; font-size:1.2rem;">${bedtimes[1]}</span><br><small style="color:#cbd5e1;font-weight:normal;">5 Cycles</small></div>
            <div title="Minimum (6 hours)"><span style="color:#fca5a5; font-size:1.2rem;">${bedtimes[2]}</span><br><small style="color:#cbd5e1;font-weight:normal;">4 Cycles</small></div>
        `;
    }
}

// Syncing and Loading helper functions for Express Backend

async function syncWaterCount() {
    if (!token) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
        await fetch(`${BASE_URL}/api/water`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                water_count: waterCount,
                goal: waterGoal,
                date: todayStr
            })
        });
    } catch (err) {
        console.error("Error syncing water count:", err);
    }
}

async function syncCoins(earned = 0) {
    if (!token) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
        await fetch(`${BASE_URL}/api/coins`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                coins: wellnessCoins,
                earned: earned,
                date: todayStr
            })
        });
    } catch (err) {
        console.error("Error syncing coins:", err);
    }
}

async function logWorkout(target) {
    if (!token) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    let steps = 3000;
    let calories = 350;
    let duration = 30;
    
    if (target === 'Belly Fat') { steps = 2500; calories = 280; duration = 25; }
    else if (target === 'Arms') { steps = 1000; calories = 200; duration = 20; }
    else if (target === 'Legs') { steps = 3500; calories = 400; duration = 35; }
    else if (target === 'Full Body') { steps = 4000; calories = 450; duration = 40; }

    try {
        const response = await fetch(`${BASE_URL}/api/workout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                duration,
                steps,
                calories,
                coins_earned: 50,
                date: todayStr
            })
        });
        if (response.ok) {
            const data = await response.json();
            wellnessCoins = data.coins;
            document.getElementById('coin-display').textContent = wellnessCoins + " Coins";
            const acd = document.getElementById('analytics-coin-display');
            if (acd) acd.textContent = wellnessCoins;
        }
    } catch (err) {
        console.error("Error logging workout:", err);
    }
}

async function logSleepData() {
    if (!token) {
        alert("Please log in first.");
        return;
    }
    const hours = parseFloat(document.getElementById('sleep-hours-input').value) || 7.5;
    const efficiency = parseInt(document.getElementById('sleep-eff-input').value) || 85;
    const todayStr = new Date().toISOString().slice(0, 10);

    try {
        const res = await fetch(`${BASE_URL}/api/sleep`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                hours,
                efficiency,
                date: todayStr
            })
        });
        if (res.ok) {
            alert("Sleep logged successfully!");
            if (document.getElementById('analytics-screen').classList.contains('active')) {
                loadAnalytics();
            }
        } else {
            alert("Failed to log sleep");
        }
    } catch (err) {
        console.error("Error logging sleep:", err);
    }
}

async function loadAnalytics() {
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/api/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            
            const stepsVal = data.steps >= 1000 ? (data.steps / 1000).toFixed(1) + 'k' : data.steps;
            document.getElementById('analytics-steps').textContent = stepsVal;
            document.getElementById('analytics-calories').textContent = Number(data.calories).toLocaleString();
            
            const activeHrs = (data.active_minutes / 60).toFixed(1);
            document.getElementById('analytics-active').textContent = `${activeHrs}h`;
            
            const sleepHrs = Math.floor(data.avg_sleep_hours);
            const sleepMins = Math.round((data.avg_sleep_hours - sleepHrs) * 60);
            document.getElementById('analytics-sleep-duration').textContent = `${sleepHrs}h ${sleepMins}m`;
            
            document.getElementById('analytics-sleep-bar').style.width = `${data.avg_sleep_efficiency}%`;
            document.getElementById('analytics-sleep-eff').textContent = `${data.avg_sleep_efficiency}% Efficiency`;
            
            document.getElementById('analytics-water-avg').textContent = data.avg_water_glasses;
            
            const waterPercent = Math.min(100, Math.round((data.avg_water_glasses / 8) * 100));
            document.getElementById('analytics-water-bar').style.width = `${waterPercent}%`;
        }
    } catch (err) {
        console.error("Error loading analytics:", err);
    }
}
