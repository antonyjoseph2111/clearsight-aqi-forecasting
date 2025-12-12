// Advisory Engine - The "Brain" of the system
// Handles medical logic, risk assessment, and recommendation generation

class AdvisoryEngine {
    constructor() {
        this.riskLevels = ['Low', 'Moderate', 'High', 'Very High', 'Severe'];
    }

    /**
     * Generate comprehensive health advisory
     * @param {Object} profile - User health profile
     * @param {Object} aqiData - Air quality data
     * @returns {Object} Complete advisory report
     */
    generateAdvisory(profile, aqiData) {
        try {
            console.log("Generating advisory for profile:", profile);

            // 1. Calculate Risk Level
            const riskAssessment = this._assessRisk(profile, aqiData);

            // 2. Identify Health Impacts
            const healthImpacts = this._identifyHealthImpacts(profile, aqiData);

            // 3. Generate Personalized Recommendations using Logic + Gemini
            const recommendations = this._generateRecommendations(profile, aqiData, riskAssessment);

            // 4. Generate Urgent Warnings
            const warnings = this._generateWarnings(profile, aqiData, riskAssessment);

            // 5. Create Activity Plan
            const activityPlan = this._createActivityPlan(profile, aqiData, riskAssessment);

            return {
                riskLevel: riskAssessment.level,
                riskScore: riskAssessment.score,
                riskSummary: riskAssessment.summary,
                healthImpacts,
                recommendations,
                warnings,
                activityPlan,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logError(error, 'AdvisoryEngine.generateAdvisory');
            throw error;
        }
    }

    /**
     * Assess health risk based on AQI and Profile
     */
    _assessRisk(profile, aqiData) {
        const aqi = aqiData.aqi.value;
        let riskScore = 0; // 0-100 scale

        // Base risk from AQI (0-50 points)
        riskScore += Math.min(aqi / 10, 50);

        // Vulnerability Multipliers
        let vulnerabilityMultiplier = 1.0;

        // Age factor
        const age = parseInt(profile.age);
        if (age < 10 || age > 65) vulnerabilityMultiplier += 0.2;
        if (age < 5 || age > 75) vulnerabilityMultiplier += 0.1;

        // Condition factors
        if (profile.respiratory && profile.respiratory.length > 0) vulnerabilityMultiplier += 0.4;
        if (profile.cardiovascular && profile.cardiovascular.length > 0) vulnerabilityMultiplier += 0.3;
        if (profile.other && profile.other.includes('pregnant')) vulnerabilityMultiplier += 0.3;
        if (profile.other && profile.other.includes('diabetes')) vulnerabilityMultiplier += 0.1;

        // Symptom factors
        if (profile.symptoms && profile.symptoms.length > 0) vulnerabilityMultiplier += 0.2;
        if (profile.symptoms && (profile.symptoms.includes('shortness-breath') || profile.symptoms.includes('chest-tightness'))) {
            vulnerabilityMultiplier += 0.3;
        }

        // Apply multiplier
        riskScore *= vulnerabilityMultiplier;

        // Cap at 100
        riskScore = Math.min(riskScore, 100);

        // Determine category
        let level;
        let summary;

        if (riskScore < 20) {
            level = 'Low';
            summary = "Air quality is acceptable for you. Enjoy your day!";
        } else if (riskScore < 40) {
            level = 'Moderate';
            summary = "Minor health risk. Sensitive individuals should be cautious.";
        } else if (riskScore < 60) {
            level = 'High';
            summary = "Significant health risk. Limit outdoor exposure.";
        } else if (riskScore < 80) {
            level = 'Very High';
            summary = "Dangerous conditions. Avoid outdoor activities.";
        } else {
            level = 'Severe';
            summary = "CRITICAL HEALTH RISK. Stay indoors and take protective measures immediately.";
        }

        return { level, score: Math.round(riskScore), summary };
    }

    /**
     * Identify specific health impacts based on pollutants
     */
    _identifyHealthImpacts(profile, aqiData) {
        const impacts = [];
        const pollutants = aqiData.pollutants;

        // PM2.5 Impacts
        if (pollutants.pm25 > 60) {
            if (profile.respiratory && profile.respiratory.includes('asthma')) {
                impacts.push("High PM2.5 may trigger asthma attacks and respiratory inflammation.");
            } else if (profile.cardiovascular && profile.cardiovascular.length > 0) {
                impacts.push("Fine particles can convert to bloodstream, increasing cardiac stress.");
            } else {
                impacts.push("Prolonged exposure to fine particles may cause throat irritation and coughing.");
            }
        }

        // NO2 Impacts
        if (pollutants.no2 > 80) {
            if (profile.respiratory && (profile.respiratory.includes('asthma') || profile.respiratory.includes('bronchitis'))) {
                impacts.push("Elevated NO2 levels significantly aggravate bronchial symptoms.");
            }
        }

        // O3 Impacts
        if (pollutants.o3 > 100) {
            impacts.push("Ground-level ozone may cause chest pain, coughing, and throat irritation.");
        }

        // General Symptom Correlation
        if (profile.symptoms && profile.symptoms.includes('cough') && aqiData.aqi.value > 200) {
            impacts.push("Current pollution levels are likely exacerbating your cough.");
        }

        return impacts;
    }

    /**
     * Generate specific, personalized recommendations
     */
    _generateRecommendations(profile, aqiData, risk) {
        const recommendations = [];

        // 1. Outdoor Activity
        if (risk.level === 'Severe' || risk.level === 'Very High') {
            recommendations.push({
                type: 'activity',
                icon: '🏠',
                title: 'Stay Indoors',
                text: 'Strictly avoid outdoor activities. Keep windows and doors closed.'
            });
        } else if (risk.level === 'High') {
            recommendations.push({
                type: 'activity',
                icon: '🚶',
                title: 'Limit Exposure',
                text: 'Reduce prolonged outdoor exertion. Take breaks if effective.'
            });
        }

        // 2. Protection (Masks)
        if (aqiData.aqi.value > 150 || (risk.level !== 'Low' && isSensitiveGroup(profile))) {
            recommendations.push({
                type: 'protection',
                icon: '😷',
                title: 'Wear N95/N99 Mask',
                text: 'Cloth masks are ineffective against PM2.5. Use a fitted N95/N99 respirator if you must go out.'
            });
        }

        // 3. Air Purification
        if (aqiData.aqi.value > 200) {
            recommendations.push({
                type: 'environment',
                icon: '🌬️',
                title: 'Use Air Purifier',
                text: 'Run HEPA air purifier on High/Turbo mode given current PM2.5 levels.'
            });
        }

        // 4. Medication/Health Management (Non-prescription)
        if (profile.respiratory && profile.respiratory.length > 0) {
            recommendations.push({
                type: 'health',
                icon: '💊',
                title: 'Medication Readiness',
                text: 'Keep your rescue inhaler/medication accessible. Monitor peak flow if applicable.'
            });
        }

        if (profile.symptoms && (profile.symptoms.includes('cough') || profile.symptoms.includes('throat-irritation'))) {
            recommendations.push({
                type: 'relief',
                icon: '💧',
                title: 'Hydration & Steam',
                text: 'Stay hydrated to keep airways moist. Steam inhalation can help soothe throat irritation.'
            });
        }

        // 5. General Health (for users with no specific conditions)
        const hasConditions = (profile.respiratory && profile.respiratory.length > 0) ||
            (profile.cardiovascular && profile.cardiovascular.length > 0) ||
            (profile.other && profile.other.length > 0) ||
            (profile.symptoms && profile.symptoms.length > 0);

        if (!hasConditions && risk.level !== 'Severe' && risk.level !== 'Very High') {
            recommendations.push({
                type: 'lifestyle',
                icon: '🥗',
                title: 'Maintain Immunity',
                text: 'Healthy individuals should focus on antioxidant-rich diet and hydration to mitigate general pollution effects.'
            });

            if (aqiData.aqi.value < 100) {
                recommendations.push({
                    type: 'activity',
                    icon: '🏃',
                    title: 'Safe for Activity',
                    text: 'Great conditions for outdoor exercise! Enjoy the relatively clean air.'
                });
            }
        }

        return recommendations;
    }

    /**
     * Generate urgent warnings for severe conditions
     */
    _generateWarnings(profile, aqiData, risk) {
        const warnings = [];

        // Emergency Escalation
        if (risk.level === 'Severe' && profile.symptoms &&
            (profile.symptoms.includes('shortness-breath') || profile.symptoms.includes('chest-tightness'))) {
            warnings.push("URGENT: Your symptoms combined with severe AQI indicate high risk. Consult a doctor immediately if breathing becomes difficult.");
        }

        // Specific Vulnerability Warnings
        if (profile.cardiovascular && profile.cardiovascular.length > 0 && aqiData.aqi.value > 300) {
            warnings.push("Cardiac Alert: Extremely high pollution triggers inflammation. Avoid ALL physical exertion.");
        }

        return warnings;
    }

    /**
     * Create safe activity plan
     */
    _createActivityPlan(profile, aqiData, risk) {
        const timeOfDay = getTimeOfDay();
        let recommendation = "";

        if (risk.level === 'Severe') {
            recommendation = "No safe time for outdoor exercise today. Perform light indoor activities like yoga or stretching.";
        } else if (risk.level === 'Very High') {
            recommendation = "Avoid outdoor exercise. Walking is safe only with N95 mask for short duration (<30 mins).";
        } else {
            if (timeOfDay === 'morning' && aqiData.aqi.value > 150) {
                recommendation = "AQI is often worst in early morning. Delay outdoor activities until afternoon (12 PM - 4 PM) when levels may drop.";
            } else {
                recommendation = "Best time for ventilation or short walks is between 2 PM and 4 PM when PM levels are typically lowest.";
            }
        }

        return recommendation;
    }

    /**
     * Call Gemini API for advanced personalized insight
     */
    async generateGeminiInsight(profile, aqiData, risk) {
        try {
            console.log("Calling Gemini API for insight...");

            // Construct the prompt
            const prompt = this._constructGeminiPrompt(profile, aqiData, risk);

            const url = `${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`;

            // Check if key is configured
            if (!CONFIG.GEMINI_API_KEY) {
                return "AI Insight unavailable (Missing API Key).";
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                return data.candidates[0].content.parts[0].text;
            }

            return "Unable to generate AI insight at this time.";

        } catch (error) {
            logError(error, 'AdvisoryEngine.generateGeminiInsight');
            // Fallback message
            return "AI Insight unavailable (Network/API Error). Showing standard system recommendations.";
        }
    }

    _constructGeminiPrompt(profile, aqiData, risk) {
        return `
            Act as a medical health expert for air quality. 
            Analyze this patient profile and current Delhi-NCR air quality data.
            
            PATIENT PROFILE:
            - Age: ${profile.age}
            - Gender: ${profile.gender}
            - Conditions: ${[...profile.respiratory, ...profile.cardiovascular, ...profile.other].join(', ') || 'None'}
            - Symptoms: ${profile.symptoms.join(', ') || 'None'}
            - Activity Level: ${profile.activityLevel}
            
            CURRENT AIR QUALITY:
            - AQI: ${aqiData.aqi.value} (${aqiData.aqi.category})
            - Main Pollutants: PM2.5 (${aqiData.pollutants.pm25}), PM10 (${aqiData.pollutants.pm10}), NO2 (${aqiData.pollutants.no2})
            - Risk Level: ${risk.level}
            
            TASK:
            Provide a concise, 3-sentence personalized health insight. 
            1. Explain specifically why current conditions are risky for *this specific person* based on their conditions.
            2. Give one specific, non-obvious protective tip.
            3. Tone: Professional, medically sound, urgent if risk is High/Severe.
            Do not recommend prescription drugs.
        `;
    }
}

const advisoryEngine = new AdvisoryEngine();
