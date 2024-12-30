import { AlarmDetails, SeverityLevel, SlackBlock, SlackMessage } from '@interfaces/alarms';
import { CloudWatchAlarmData, CloudWatchAlarmConfiguration, CloudWatchAlarmMetric } from 'aws-lambda';

export function parseTimestamp(timestampStr: string): string {
  try {
    const dt = new Date(timestampStr);
    return dt.toLocaleString('en-US', { timeZone: 'UTC' });
  } catch {
    return timestampStr;
  }
}

export function getAlarmDetails(alarmData: CloudWatchAlarmData): AlarmDetails {
  const state = alarmData.state;
  const previousState = alarmData.previousState;
  
  // Type assertion to check if configuration has metrics 
  const configurationWithMetrics = alarmData.configuration as CloudWatchAlarmConfiguration;
  const metrics = configurationWithMetrics.metrics[0] as CloudWatchAlarmMetric;
  const metricStat = metrics.metricStat.metric;

  return {
    name: alarmData.alarmName || 'Unknown Alarm',
    current_state: state.value || 'UNKNOWN',
    previous_state: previousState.value || 'UNKNOWN',
    reason: state.reason || 'No reason provided',
    timestamp: state.timestamp || new Date().toISOString(),
    namespace: metricStat.namespace || 'Unknown Namespace',
    metric_name: metricStat.name || 'Unknown Metric',
    dimensions: metricStat.dimensions
  };
}

export function determineSeverity(alarmDetails: AlarmDetails): SeverityLevel {
  const severityLevels: Record<string, SeverityLevel> = {
    critical: { icon: '🔴', color: '#FF0000', priority: 1 },
    high: { icon: '🟠', color: '#FFA500', priority: 2 },
    medium: { icon: '🟡', color: '#FFFF00', priority: 3 },
    low: { icon: '🟢', color: '#36A64F', priority: 4 }
  };

  if (alarmDetails.current_state !== 'ALARM') {
    return severityLevels.low;
  }

  const nameLower = alarmDetails.name.toLowerCase();
  const namespaceLower = alarmDetails.namespace.toLowerCase();

  const severityRules = [
    {
      level: 'critical',
      patterns: {
        name: ['critical', 'severe', 'p1', 'emergency'],
        namespace: ['AWS/RDS', 'AWS/ElastiCache'],
        metric: ['CPUUtilization', 'FreeableMemory', 'DatabaseConnections']
      }
    },
    {
      level: 'high',
      patterns: {
        name: ['high', 'important', 'p2', 'error'],
        namespace: ['AWS/EC2', 'AWS/Lambda'],
        metric: ['ErrorRate', 'Latency', 'ThrottledRequests']
      }
    },
    {
      level: 'medium',
      patterns: {
        name: ['medium', 'moderate', 'p3', 'warning'],
        namespace: ['AWS/CloudFront', 'AWS/S3'],
        metric: ['4XXError', 'BucketSizeBytes']
      }
    }
  ];

  for (const rule of severityRules) {
    const patterns = rule.patterns;
    if (
      patterns.name.some(p => nameLower.includes(p)) ||
      patterns.namespace.some(p => namespaceLower.includes(p)) ||
      patterns.metric.some(p => p === alarmDetails.metric_name)
    ) {
      return severityLevels[rule.level];
    }
  }

  return severityLevels.low;
}

export function createSlackBlocks(alarmDetails: AlarmDetails, severity: SeverityLevel): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${severity.icon} Alarm: ${alarmDetails.name}`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status:*\n${alarmDetails.current_state}`
        },
        {
          type: 'mrkdwn',
          text: `*Previous State:*\n${alarmDetails.previous_state}`
        }
      ]
    }
  ];

  if (alarmDetails.namespace && alarmDetails.metric_name) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Namespace:*\n${alarmDetails.namespace}`
        },
        {
          type: 'mrkdwn',
          text: `*Metric:*\n${alarmDetails.metric_name}`
        }
      ]
    });
  }

  blocks.push(
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Time:*\n${parseTimestamp(alarmDetails.timestamp)}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Reason:*\n${alarmDetails.reason}`
      }
    }
  );

  return blocks;
}

export function formatSlackMessage(alarmDetails: AlarmDetails, severity: SeverityLevel): SlackMessage {
  return {
    color: severity.color,
    blocks: createSlackBlocks(alarmDetails, severity)
  };
}