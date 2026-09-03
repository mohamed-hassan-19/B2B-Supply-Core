import { Injectable } from '@nestjs/common';
import { OrderActivityLog } from '../../database/models';
import { Op } from 'sequelize';

@Injectable()
export class ReportsService {
  async getDurations() {
    const logs = await OrderActivityLog.findAll({
      where: {
        action_type: 'status_changed'
      },
      order: [['order_id', 'ASC'], ['createdAt', 'ASC']]
    });

    // Group logs by transition (from_status -> to_status)
    const transitions: Record<string, number[]> = {};
    const cancellations: number[] = [];

    // To compute durations, we need the exact time difference between the status changing into from_status and then changing to to_status.
    // Actually, each log marks the *exact moment* the transition occurred.
    // If order went pending -> approved at T1, and approved -> processing at T2:
    // Log 1: from_status: pending, to_status: approved, createdAt: T1
    // Log 2: from_status: approved, to_status: processing, createdAt: T2
    // The duration of the 'approved' phase (pending->approved -> approved->processing) is T2 - T1.
    // Wait, the user specifically said: "average durations by the actual matched transition pair (from_status + to_status)".
    // A log itself represents a transition. "pending -> approved" happened at T1.
    // But duration is the time spent *in* a status. Or does the user mean the time between two logs?
    // "average time to cancellation" -> time from 'created' to 'cancelled'?
    // Let's find the 'created' log or the previous log for the same order.
    
    // Better logic: Group all logs by order_id.
    const logsByOrder: Record<number, any[]> = {};
    for (const log of logs) {
      if (!logsByOrder[log.order_id]) logsByOrder[log.order_id] = [];
      logsByOrder[log.order_id].push(log);
    }
    
    // Fetch 'created' logs to know when each order started
    const createdLogs = await OrderActivityLog.findAll({
      where: { action_type: 'created' }
    });
    const createdMap: Record<number, any> = {};
    for (const log of createdLogs) {
      createdMap[log.order_id] = log;
    }

    for (const orderId in logsByOrder) {
      const orderLogs = logsByOrder[orderId];
      // We also include the 'created' event as the starting point for the first status transition (e.g. pending -> ...)
      // actually, 'created' sets it to 'pending'.
      let lastTime = createdMap[orderId] ? new Date(createdMap[orderId].createdAt).getTime() : null;
      let lastStatus = 'pending';

      for (const log of orderLogs) {
        const currentTime = new Date(log.createdAt).getTime();
        
        if (lastTime && log.from_status === lastStatus) {
          const durationMs = currentTime - lastTime;
          const durationHours = durationMs / (1000 * 60 * 60); // convert to hours
          
          if (log.to_status === 'cancelled') {
            // "average time to cancellation" - could be total time from creation, or time from last status.
            // Let's do time from creation to cancellation for "time to cancellation"
            const creationTime = createdMap[orderId] ? new Date(createdMap[orderId].createdAt).getTime() : lastTime;
            const totalTimeToCancel = (currentTime - creationTime) / (1000 * 60 * 60);
            cancellations.push(totalTimeToCancel);
          } else {
            const pairKey = `${log.from_status}->${log.to_status}`;
            if (!transitions[pairKey]) transitions[pairKey] = [];
            transitions[pairKey].push(durationHours);
          }
        }
        
        // Advance the pointer
        lastTime = currentTime;
        lastStatus = log.to_status;
      }
    }

    const averages: Record<string, number> = {};
    for (const [pair, durations] of Object.entries(transitions)) {
      const sum = durations.reduce((a, b) => a + b, 0);
      averages[pair] = sum / durations.length;
    }

    const cancellationMetrics = {
      average_time_to_cancellation_hours: cancellations.length ? (cancellations.reduce((a, b) => a + b, 0) / cancellations.length) : 0,
      total_cancellations: cancellations.length
    };

    return {
      averages_hours: averages,
      cancellationMetrics
    };
  }
}
