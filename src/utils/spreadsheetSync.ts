/**
 * Googleスプレッドシート（GAS Webhook）同期通信クライアント
 */

import { ParticipantCheckInRecord } from '@/types';

export interface SheetFetchResult {
  success: boolean;
  initialized?: boolean;
  records?: Record<string, ParticipantCheckInRecord>;
  updatedAt?: string;
  error?: string;
}

export interface SheetMutationResult {
  success: boolean;
  message?: string;
  count?: number;
  error?: string;
}

/**
 * スプレッドシートから最新の受付データを取得（GET）
 */
export async function fetchSheetData(webhookUrl: string): Promise<SheetFetchResult> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: '有効なWebhook URLが指定されていません' };
  }

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return { success: false, error: `スプレッドシート通信エラー (HTTP ${res.status})` };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to fetch from Google Spreadsheet', err);
    return { success: false, error: err.message || '通信に失敗しました' };
  }
}

/**
 * 空のスプレッドシートを初期化し、参加者全員の行を自動作成（POST: init）
 */
export async function initSpreadsheet(
  webhookUrl: string,
  participants: {
    memberName: string;
    songCount: number;
    parts: string[];
    hasRental: boolean;
    rentalItemName?: string;
    partyJoined: boolean;
    calculatedFee: number;
    paid: boolean;
    checkedIn: boolean;
    checkInTime?: string;
    notes?: string;
  }[]
): Promise<SheetMutationResult> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: '有効なWebhook URLが指定されていません' };
  }

  try {
    const payload = {
      action: 'init',
      participants
    };

    // Google Apps ScriptのCORS仕様に合わせて text/plain でPOST
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!res.ok) {
      return { success: false, error: `スプレッドシート初期化エラー (HTTP ${res.status})` };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to init Google Spreadsheet', err);
    return { success: false, error: err.message || '初期化リクエストに失敗しました' };
  }
}

/**
 * 単一参加者のステータス（支払・入場・懇親会・レンタル等）を更新（POST: update）
 */
export async function updateParticipantOnSheet(
  webhookUrl: string,
  record: ParticipantCheckInRecord,
  parts?: string[],
  rentalItemName?: string
): Promise<SheetMutationResult> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: '有効なWebhook URLが指定されていません' };
  }

  try {
    const payload = {
      action: 'update',
      record: {
        ...record,
        parts: parts || [],
        rentalItemName: rentalItemName || ''
      }
    };

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!res.ok) {
      return { success: false, error: `更新通信エラー (HTTP ${res.status})` };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error(`Failed to update participant ${record.memberName} on Spreadsheet`, err);
    return { success: false, error: err.message || '更新に失敗しました' };
  }
}
