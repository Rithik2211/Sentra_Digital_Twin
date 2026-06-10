import Groq from 'groq-sdk';
import crypto from 'crypto';
import { cacheGet, cacheSet } from './redis';

const groqApiKey = process.env.GROQ_API_KEY || '';
let groq: Groq | null = null;

if (groqApiKey) {
  groq = new Groq({ apiKey: groqApiKey });
}

export async function generateSupervisorBriefing(
  runId: string, 
  scenario: string, 
  activeAlarms: string[]
): Promise<{ briefing: string; cached: boolean }> {
  // Construct a deterministic prompt string
  const promptInput = `Scenario: ${scenario}. Active Alarms: ${activeAlarms.sort().join(', ') || 'None'}.`;
  
  // Calculate MD5 hash
  const hash = crypto.createHash('md5').update(promptInput).digest('hex');
  const cacheKey = `briefing:${hash}`;

  // Check Redis cache
  const cachedBriefing = await cacheGet(cacheKey);
  if (cachedBriefing) {
    return { briefing: cachedBriefing, cached: true };
  }

  let briefing = '';

  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an AI safety operations supervisor for SENTRA Industrial Digital Twin. Generate a highly detailed, professional, multi-step supervisor briefing in Markdown based on the active scenario and alerts. Focus on immediate containment, evacuation zones, engineering overrides, and status summaries. Format the output nicely with bullet points and bold highlights.'
          },
          {
            role: 'user',
            content: `Generate a supervisor briefing for the current state.
            Scenario Context: ${scenario}
            Active Alarms and Risk Indicators: ${activeAlarms.length > 0 ? activeAlarms.join('; ') : 'No active alerts. Routine monitoring.'}
            Provide:
            1. Executive summary of the situation.
            2. Detailed risk analysis (impacted Zones A-D, worker status, sensor thresholds breached).
            3. Containment and mitigation protocols (engineering controls, sirens, evacuations).
            4. Next-step recommendations for control room supervisors.`
          }
        ],
        model: 'llama-3.3-70b-versatile'
      });

      briefing = response.choices[0]?.message?.content || 'No response generated.';
    } catch (error) {
      console.error('Groq API error, falling back to mock briefing:', error);
      briefing = getMockBriefing(scenario, activeAlarms);
    }
  } else {
    // Artificial delay to simulate LLM latency
    await new Promise((resolve) => setTimeout(resolve, 1200));
    briefing = getMockBriefing(scenario, activeAlarms);
  }

  // Cache in Redis/in-memory for 15 minutes (900 seconds)
  await cacheSet(cacheKey, briefing, 900);

  return { briefing, cached: false };
}

function getMockBriefing(scenario: string, activeAlarms: string[]): string {
  const timestamp = new Date().toLocaleTimeString();

  if (scenario.includes('Night Shift')) {
    return `### 📋 Supervisor Briefing: Night Shift & High Load
**Status Update:** ${timestamp} | **Operating Mode:** Automated High-Throughput
**Risk Level:** ${activeAlarms.length > 0 ? '⚠️ MODERATE' : '🟢 NORMAL'}

#### 1. Executive Summary
The facility is operating at 115% nominal capacity to meet end-of-quarter manufacturing targets. Night shift crew is minimized to standard 12-person layout. High grid power draw is active.

#### 2. Risk Analysis
- **Impacted Zones:** Zone A (Raw Materials) and Zone B (Blast Furnace) are exhibiting elevated thermodynamic profiles.
- **Worker Status:** All 12 worker agents are accounted for. Node positions indicate concentrated activity near assembly lines in Zone C.
- **Sensor Readings:** Conveyor speed is at maximum limits (85.2 RPM). Furnace temperature is stable at 1150°C.
${activeAlarms.length > 0 ? `- **Alerts Triggered:** ${activeAlarms.map(a => `\`${a}\``).join(', ')}` : '- **Alerts Triggered:** None.'}

#### 3. Operational Directives
- **Conveyor Load Management:** Ensure raw material mixing ratios remain consistent. Monitor conveyor belt motor thermal sensors.
- **Ventilation Audit:** Blast furnace auxiliary ventilation systems must remain on continuous cycles to mitigate particulate accumulation.
- **Crew Fatigue Protocol:** Mandate a 15-minute rotation for floor workers in heat-exposed zones every 2 hours.

#### 4. Recommended Actions
1. Verify secondary cooling water valve pressure in Zone B.
2. Confirm emergency exit routes in Zone C are completely unobstructed.
3. Keep emergency response teams on standard standby.`;
  }

  if (scenario.includes('Chemical Spill')) {
    return `### 🚨 Supervisor Briefing: Zone D Chemical Spill
**Status Update:** ${timestamp} | **Emergency Phase:** Phase 2 (Localized Hazard)
**Risk Level:** 🔴 CRITICAL

#### 1. Executive Summary
A structural failure in a localized chemical feeder tank has caused a leak of acidic chemical compound in **Zone D (Chemical Treatment & Storage)**. Hazardous fumes are migrating toward Zone B.

#### 2. Risk Analysis
- **Impacted Zones:** Zone D (Spill Source - CRITICAL), Zone B (Vapor migration - WARNING).
- **Worker Status:** Evacuation procedures initiated for workers in Zone D. Worker 'Agent Carter' and 'Agent Davis' have successfully retreated to the Zone C muster point. Worker 'Agent Bennett' is navigating away from the spill source.
- **Sensor Readings:** H2S gas levels in Zone D have spiked to **12.4 ppm** (Threshold: 5.0 ppm). Chemical storage tank temp is rising.
- **Alerts Triggered:** ${activeAlarms.length > 0 ? activeAlarms.map(a => `\`${a}\``).join(', ') : '\`CRITICAL_GAS_SPIKE_ZONE_D\`, \`ZONE_D_IMMEDIATE_EVACUATE\`'}

#### 3. Containment & Mitigation
- **Zone D Quarantine:** Automated magnetic fire doors in Zone D have been sealed. Scrubbers are activated at 100% capacity.
- **HVAC Isolation:** Redirected facility HVAC airflow to draw negative pressure on Zone D, preventing toxic gas accumulation in adjacent Zone C.
- **Neutralizer Deployment:** Prepared manual spill response team with dry soda ash neutralizers.

#### 4. Action Directives
1. **DO NOT** enter Zone D without Class-A pressurized vapor suits.
2. Monitor H2S sensor D2 closely. If levels exceed 20 ppm, sound the general assembly alarm.
3. Coordinate with municipal emergency dispatch for chemical containment support.`;
  }

  if (scenario.includes('Power Outage')) {
    return `### 🔌 Supervisor Briefing: Power Outage & Emergency
**Status Update:** ${timestamp} | **Emergency Phase:** Phase 3 (Facility-wide Blackout)
**Risk Level:** 🔴 CRITICAL

#### 1. Executive Summary
A sudden primary grid substation failure has resulted in complete loss of utility power. The factory has automatically switched to Emergency Back-Up Generator Set 1 & 2.

#### 2. Risk Analysis
- **Impacted Zones:** All Zones (A, B, C, D) are running on limited battery and diesel power.
- **Worker Status:** Visual monitoring offline. Worker agents are using emergency personal locators. All agents are directed to move immediately to Zone C (Safe Muster Point).
- **Sensor Readings:** Cooling loop pumps in Zone B are operating on backup power (current flow at 60% nominal). Furnace heater circuits deactivated; furnace cooling must be managed to prevent thermal shock.
- **Alerts Triggered:** ${activeAlarms.length > 0 ? activeAlarms.sort().map(a => `\`${a}\``).join(', ') : '\`GRID_POWER_LOST\`, \`BACKUP_GENERATOR_ACTIVE\`, \`FACILITY_BLACKOUT\`'}

#### 3. Containment & Emergency Protocols
- **Safe State Machinery:** Heavy rollers and conveyor belts have been forced into electromagnetic emergency stops.
- **Evacuation Guidance:** Emergency pathway lighting is active. Workers must proceed along green LED strips to the central muster area.
- **Backup Fuel Monitoring:** Gen-Set diesel fuel levels are at 84%, providing approximately 3.5 hours of operation.

#### 4. Action Directives
1. Verify automatic start of Diesel Fire Pump in Zone D.
2. Dispatch a technician (with flashlight and radio) to inspect the substation circuit breaker 4B.
3. Minimize non-essential electrical loads to extend generator runtime.`;
  }

  return `### 🟢 Supervisor Briefing: Routine Monitoring
**Status Update:** ${timestamp} | **Facility Status:** Operational
**Risk Level:** 🟢 LOW

#### 1. Executive Summary
SENTRA Industrial Complex is operating within normal parameters. Production quotas are steady and worker distribution is balanced across all four active quadrants.

#### 2. Risk Analysis
- **Zones A-D:** All zones report green status.
- **Worker Status:** 8 workers active across the floor. Floor spacing is compliant with safety guidelines.
- **Sensors:** Temperature, pressure, and gas sensors are within safe baseline tolerances.

#### 3. Directives
- Continue standard logging. No immediate action required.`;
}
export { getMockBriefing };
