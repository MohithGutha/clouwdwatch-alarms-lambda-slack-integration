// CloudWatch Alarm types
export interface AlarmMetric {
  namespace?: string;
  name?: string;
  dimensions?: Record<string, string>;
}

export interface AlarmState {
  value?: string;
  reason?: string;
  timestamp?: string;
}

// export interface AlarmData {
//   alarmName?: string;
//   state?: AlarmState;
//   previousState?: AlarmState;
//   configuration?: {
//     metrics?: Array<{
//       metricStat?: {
//         metric?: AlarmMetric;
//       };
//     }>;
//   };
// }

export interface AlarmDetails {
  name: string;
  current_state: string;
  previous_state: string;
  reason: string;
  timestamp: string;
  namespace: string;
  metric_name: string;
  dimensions?: Record<string, string>;
}

// export interface ValidatedEvents {
//   body: AlarmData;
// }

// Severity types
export interface SeverityLevel {
  icon: string;
  color: string;
  priority: number;
}

// Slack message types
export interface SlackField {
  type: string;
  text: string;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: SlackField[];
}

export interface SlackMessage {
  color: string;
  blocks: SlackBlock[];
}

// export interface LambdaEvent {
//   alarmData: AlarmData;
// }