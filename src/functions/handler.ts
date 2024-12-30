import { Handler, Context, CloudWatchAlarmEvent } from 'aws-lambda';
import * as https from 'node:https';
import { middyfy } from '@libs/lambda';
import { SlackMessage } from '@interfaces/alarms';
import { getAlarmDetails, determineSeverity, formatSlackMessage } from '@utils/alarms.utils';

const handleAlarm: Handler = async (event: CloudWatchAlarmEvent, context: Context) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (!event.alarmData) {
      throw new Error('No alarm data found in event');
    }

    const alarmDetails = getAlarmDetails(event.alarmData);
    const severity = determineSeverity(alarmDetails);
    const slackMessage = formatSlackMessage(alarmDetails, severity);

    await sendToSlack(slackMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Alert sent to Slack successfully'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const handler = middyfy(handleAlarm);

// Send message to Slack
function sendToSlack(message: SlackMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        reject(new Error('SLACK_WEBHOOK_URL environment variable is not set'));
        return;
      }
  
      const url = new URL(webhookUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
  
      const req = https.request(options, (res) => {
        let responseBody = '';
        res.setEncoding('utf8');
  
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
  
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Request to Slack returned error ${res.statusCode}, response: ${responseBody}`));
            return;
          }
          resolve();
        });
      });
  
      req.on('error', reject);
      req.write(JSON.stringify(message));
      req.end();
    });
  }