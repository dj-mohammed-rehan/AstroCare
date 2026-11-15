import { GoogleGenAI, Type } from '@google/genai';
import type {
  AstraPulseAnalysisResult,
  AstraPulseRequestPayload,
  AstraPulseResponse,
} from '../../src/types/index.ts';

const DISCLAIMER =
  'AI-assisted demonstration, not a medical diagnosis. Telemetry shown is simulated for mission-control evaluation and is not clinically validated.';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

function validateAndNormalizeAnalysis(raw: unknown): AstraPulseAnalysisResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const risk =
    obj.riskLevel === 'LOW' || obj.riskLevel === 'MODERATE' || obj.riskLevel === 'HIGH'
      ? obj.riskLevel
      : null;
  if (!risk || typeof obj.summary !== 'string' || !obj.summary.trim()) {
    return null;
  }

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val)
      ? val
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, 8)
      : [];

  const dataQuality =
    obj.dataQuality === 'SUFFICIENT' || obj.dataQuality === 'LIMITED'
      ? obj.dataQuality
      : 'SUFFICIENT';

  return {
    riskLevel: risk,
    summary: obj.summary.trim(),
    observations: toStringArray(obj.observations),
    contributingFactors: toStringArray(obj.contributingFactors),
    recommendedActions: toStringArray(obj.recommendedActions),
    dataQuality,
    disclaimer:
      typeof obj.disclaimer === 'string' && obj.disclaimer.trim().length > 0
        ? obj.disclaimer.trim()
        : DISCLAIMER,
  };
}

export function buildRuleBasedFallback(
  payload: AstraPulseRequestPayload,
  reason: string
): AstraPulseResponse {
  const r = payload.currentReading;
  const observations: string[] = [];
  const contributingFactors: string[] = [];
  const recommendedActions: string[] = [];
  let severityScore = 0;

  if (r.heartRate >= 120 || r.heartRate <= 42) {
    severityScore += 3;
    observations.push(`Heart rate is significantly out of nominal range at ${r.heartRate} BPM.`);
    contributingFactors.push('Elevated cardiac workload or autonomic strain');
    recommendedActions.push('Reduce physical exertion immediately and verify chest strap sensor contact.');
  } else if (r.heartRate >= 100 || r.heartRate <= 49) {
    severityScore += 1;
    observations.push(`Heart rate is mildly elevated/borderline at ${r.heartRate} BPM.`);
    contributingFactors.push('Moderate cardiovascular load or elevated activity');
    recommendedActions.push('Monitor heart rate recovery over the next 15 minutes.');
  } else {
    observations.push(`Heart rate is within illustrative nominal band (${r.heartRate} BPM).`);
  }

  if (r.spo2 <= 90) {
    severityScore += 3;
    observations.push(`Blood oxygen saturation (SpO2) is critically reduced at ${r.spo2}%.`);
    contributingFactors.push('Potential cabin partial-pressure O2 drop or suit O2 regulator restriction');
    recommendedActions.push('Verify habitat/suit oxygen supply and check pulse oximeter placement.');
  } else if (r.spo2 <= 94) {
    severityScore += 1;
    observations.push(`Blood oxygen saturation is mildly depressed at ${r.spo2}%.`);
    contributingFactors.push('Mild hypoxic trend or peripheral vasoconstriction');
    recommendedActions.push('Conduct controlled deep-breathing check and review ECLSS O2 telemetry.');
  } else {
    observations.push(`Blood oxygen saturation is nominal at ${r.spo2}%.`);
  }

  if (r.bodyTemperature >= 38.2 || r.bodyTemperature <= 35.4) {
    severityScore += 3;
    observations.push(`Core body temperature indicates thermal excursion at ${r.bodyTemperature.toFixed(1)}°C.`);
    contributingFactors.push('Suit cooling loop thermal imbalance or febrile physiological stress');
    recommendedActions.push('Inspect Liquid Cooling and Ventilation Garment (LCVG) flow rate and hydrate.');
  } else if (r.bodyTemperature >= 37.6 || r.bodyTemperature <= 35.9) {
    severityScore += 1;
    observations.push(`Body temperature is slightly outside baseline at ${r.bodyTemperature.toFixed(1)}°C.`);
    contributingFactors.push('Elevated metabolic heat generation');
    recommendedActions.push('Increase hydration and log follow-up thermal reading in 20 minutes.');
  } else {
    observations.push(`Core temperature is stable at ${r.bodyTemperature.toFixed(1)}°C.`);
  }

  if (r.respiratoryRate >= 24 || r.respiratoryRate <= 8) {
    severityScore += 2;
    observations.push(`Respiratory rate is abnormal at ${r.respiratoryRate} breaths/min.`);
    contributingFactors.push('Altered ventilatory drive or CO2 scrubber elevation');
    recommendedActions.push('Cross-check cabin pCO2 levels and initiate paced breathing protocol.');
  } else if (r.respiratoryRate >= 20) {
    severityScore += 1;
    observations.push(`Respiratory rate is mildly elevated at ${r.respiratoryRate} breaths/min.`);
    contributingFactors.push('Increased respiratory demand');
  }

  if (r.stressIndex >= 75) {
    severityScore += 2;
    observations.push(`Autonomic stress index is high (${r.stressIndex}/100).`);
    contributingFactors.push('High cognitive workload, circadian disruption, or physiological strain');
    recommendedActions.push('Schedule a structured rest period and flight-surgeon check-in.');
  } else if (r.stressIndex >= 55) {
    severityScore += 1;
    observations.push(`Moderate stress index recorded (${r.stressIndex}/100).`);
  }

  if (r.sleepHours < 5.5) {
    severityScore += 1;
    observations.push(`Recent sleep duration is restricted (${r.sleepHours.toFixed(1)} hrs).`);
    contributingFactors.push('Cumulative sleep debt impacting autonomic recovery');
    recommendedActions.push('Prioritize protected sleep window during next orbital rest cycle.');
  }

  if (contributingFactors.length === 0) {
    contributingFactors.push('No acute physiological anomalies detected in supplied demonstration telemetry.');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Continue standard scheduled telemetry monitoring and routine hydration.');
  }

  const riskLevel: AstraPulseAnalysisResult['riskLevel'] =
    severityScore >= 4 ? 'HIGH' : severityScore >= 2 ? 'MODERATE' : 'LOW';

  const summary =
    riskLevel === 'HIGH'
      ? `Rule-based evaluation flagged multiple or severe physiological deviations requiring immediate demonstration review (HR ${r.heartRate} BPM, SpO2 ${r.spo2}%, Temp ${r.bodyTemperature.toFixed(1)}°C).`
      : riskLevel === 'MODERATE'
        ? `Rule-based evaluation detected mild physiological drift across monitored parameters. Continued observation and supportive countermeasures are advised.`
        : `All supplied physiological indicators fall within illustrative nominal mission-control bounds with balanced autonomic recovery.`;

  return {
    engine: 'rule-based-fallback',
    fallbackReason: reason,
    timestamp: new Date().toISOString(),
    analysis: {
      riskLevel,
      summary,
      observations,
      contributingFactors,
      recommendedActions,
      dataQuality: payload.historicalSummary && payload.historicalSummary.sampleCount >= 10 ? 'SUFFICIENT' : payload.mode === 'manual' ? 'LIMITED' : 'SUFFICIENT',
      disclaimer: DISCLAIMER,
    },
  };
}

export async function analyzeTelemetryWithAstraPulse(
  payload: AstraPulseRequestPayload
): Promise<AstraPulseResponse> {
  const ai = getGeminiClient();
  if (!ai) {
    return buildRuleBasedFallback(
      payload,
      'Server GEMINI_API_KEY is not configured. Returned deterministic rule-based demonstration analysis.'
    );
  }

  const promptParts = [
    `Analysis Mode: ${payload.mode.toUpperCase()}`,
    payload.astronaut
      ? `Crew Context: ${payload.astronaut.fullName} (${payload.astronaut.callsign}), Age ${payload.astronaut.age}, Blood Group ${payload.astronaut.bloodGroup}, Mission ${payload.astronaut.missionName}`
      : 'Crew Context: Simulated Crew Member',
    `Current Simulated Telemetry:
- Heart Rate: ${payload.currentReading.heartRate} BPM
- Blood Oxygen (SpO2): ${payload.currentReading.spo2}%
- Body Temperature: ${payload.currentReading.bodyTemperature}°C
- Respiratory Rate: ${payload.currentReading.respiratoryRate} breaths/min
- Stress Index: ${payload.currentReading.stressIndex}/100
- Sleep Duration: ${payload.currentReading.sleepHours} hours
- Activity Level: ${payload.currentReading.activityLevel ?? 'Nominal'}`,
  ];

  if (payload.historicalSummary) {
    promptParts.push(
      `Historical Window (${payload.historicalSummary.windowLabel}, ${payload.historicalSummary.sampleCount} samples):
- Avg Heart Rate: ${payload.historicalSummary.avgHeartRate.toFixed(1)} BPM
- Avg SpO2: ${payload.historicalSummary.avgSpo2.toFixed(1)}%
- Avg Body Temperature: ${payload.historicalSummary.avgBodyTemperature.toFixed(2)}°C
- Avg Respiratory Rate: ${payload.historicalSummary.avgRespiratoryRate.toFixed(1)} breaths/min
- Avg Stress Index: ${payload.historicalSummary.avgStressIndex.toFixed(1)}/100
- Avg Sleep: ${payload.historicalSummary.avgSleepHours.toFixed(1)} hrs
- Recent Active/Historical Alerts: ${payload.historicalSummary.recentAlertsCount}`
    );
  }

  if (payload.notes) {
    promptParts.push(`Operator / Crew Notes: ${payload.notes}`);
  }

  try {
    let response;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: promptParts.join('\n\n'),
          config: {
            systemInstruction:
              'You are ASTRA PULSE, an aerospace physiological telemetry analysis assistant for a hackathon mission-control demonstration platform. ' +
              'Analyze the supplied simulated astronaut health metrics objectively. Never claim clinical validation or real NASA medical authority. ' +
              'Provide concise, scientifically grounded observations, contributing physiological/environmental factors (such as microgravity fluid shifts, EVA exertion, cabin pO2/pCO2, thermal load, circadian drift), and practical mission-control follow-up actions. ' +
              'Keep summary to 2-3 clear sentences and each array to 2-4 crisp bullet points.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                riskLevel: {
                  type: Type.STRING,
                  description: 'Must be exactly LOW, MODERATE, or HIGH.',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Short 2-3 sentence scientific explanation of the telemetry assessment.',
                },
                observations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Specific observations from the telemetry values and trends.',
                },
                contributingFactors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Likely physiological or spacecraft environmental contributing factors.',
                },
                recommendedActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Actionable mission-control or crew follow-up recommendations.',
                },
                dataQuality: {
                  type: Type.STRING,
                  description: 'Must be exactly SUFFICIENT or LIMITED.',
                },
                disclaimer: {
                  type: Type.STRING,
                  description: 'Clear non-clinical demonstration disclaimer.',
                },
              },
              required: [
                'riskLevel',
                'summary',
                'observations',
                'contributingFactors',
                'recommendedActions',
                'dataQuality',
                'disclaimer',
              ],
            },
          },
        });
        break;
      } catch (innerErr) {
        lastError = innerErr;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      }
    }

    if (!response) {
      throw lastError ?? new Error('Gemini API request failed');
    }

    const rawText = response.text?.trim();
    if (!rawText) {
      return buildRuleBasedFallback(
        payload,
        'Gemini returned an empty response. Switched to deterministic rule-based demonstration fallback.'
      );
    }

    const parsedJson = JSON.parse(rawText);
    const normalized = validateAndNormalizeAnalysis(parsedJson);
    if (!normalized) {
      return buildRuleBasedFallback(
        payload,
        'Gemini output failed schema validation. Switched to deterministic rule-based demonstration fallback.'
      );
    }

    return {
      engine: 'gemini-4-hydrogen',
      timestamp: new Date().toISOString(),
      analysis: normalized,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
    return buildRuleBasedFallback(
      payload,
      `Gemini API unavailable (${message.slice(0, 120)}). Switched to deterministic rule-based demonstration fallback.`
    );
  }
}
