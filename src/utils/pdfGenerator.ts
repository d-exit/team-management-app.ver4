// src/utils/pdfGenerator.ts
import { TournamentInfoFormData, TournamentBracket, LeagueTable } from '../types';
import { formatBracketForPdf, formatLeagueForPdf } from './pdfFormatters';

interface PdfContent {
  html: string;
  styles: string;
}

const escapeHTML = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const prepareTournamentPDFContent = (
  data: TournamentInfoFormData,
  bracket?: TournamentBracket,
  league?: LeagueTable
): PdfContent => {
  const buildHtml = (d: TournamentInfoFormData): string => {
    const s = (text: string | undefined | number) => escapeHTML(text?.toString().trim() || '-');
    const pre = (text: string | undefined) => {
      const escapedText = escapeHTML(text?.toString() || '');
      return `<div class="pre-wrap">${escapedText.replace(/\n/g, '<br />') || '-'}</div>`;
    };

    let fixtureHtml = '';
    if (league && league.groups.some(g => g.teams.length > 0)) {
      fixtureHtml += formatLeagueForPdf(league);
    }
    if (bracket) {
      if (fixtureHtml) fixtureHtml += `<div class="page-break"></div>`;
      fixtureHtml += formatBracketForPdf(bracket);
    }

    return `
      <h1>${s(d.eventName)}</h1>
      
      <div class="grid-container">
        <section><h2>大会概要</h2>
          <p><strong>主催:</strong> ${s(d.organizerInfo.organizationName)}</p>
          <p><strong>担当:</strong> ${s(d.organizerInfo.contactPersonName)}</p>
        </section>
        <section><h2>開催日時・会場</h2>
          <p><strong>開催日:</strong> ${s(d.eventDateTime.eventDate)}</p>
          <p><strong>時間:</strong> ${s(d.eventDateTime.startTime)} 〜 ${s(d.eventDateTime.endTime)}</p>
          <p><strong>受付:</strong> ${s(d.eventDateTime.entryTime)}</p>
          <p><strong>会場:</strong> ${s(d.venueInfo.facilityName)}</p>
          <p><strong>住所:</strong> ${s(d.venueInfo.address)}</p>
        </section>
        <section class="full-width"><h2>参加チーム</h2>${pre(d.participatingTeams)}</section>
        <section><h2>参加資格</h2>
          <p><strong>学年等:</strong> ${s(d.participantEligibility.gradeLevel)}</p>
          <p><strong>年齢制限:</strong> ${s(d.participantEligibility.ageLimit)}</p>
        </section>
        <section><h2>競技情報</h2>
          <p><strong>コート:</strong> ${s(d.courtInfo.size)} (${s(d.courtInfo.numberOfCourts)}面)</p>
          <p><strong>試合人数:</strong> ${s(d.matchFormat.playersPerTeam)}</p>
          <p><strong>ゴール:</strong> ${s(d.matchFormat.goalSpecifications)}</p>
          <p><strong>使用球:</strong> ${s(d.ballInfo)}</p>
          <p><strong>審判:</strong> ${s(d.refereeSystem)}</p>
        </section>
        <section class="full-width"><h2>競技規則</h2>${pre(d.competitionRules)}</section>
        <section><h2>試合形式・時間</h2>
          <p><strong>式典等:</strong> ${s(d.matchSchedule.ceremonyInfo)}</p>
          <p><strong>飲水タイム:</strong> ${s(d.matchSchedule.waterBreakInfo)}</p>
        </section>
        <section><h2>順位決定方法</h2>
          <p><strong>勝ち点:</strong> ${s(d.rankingMethod.pointsRule)}</p>
          <p><strong>タイブレーク:</strong> ${s(d.rankingMethod.tieBreakerRule)}</p>
          <p><strong>詳細:</strong></p>${pre(d.rankingMethod.leagueSystemDescription)}
        </section>
        <section><h2>表彰</h2>
          <p><strong>優勝:</strong> ${s(d.awards.winner)}</p>
          <p><strong>準優勝:</strong> ${s(d.awards.runnerUp)}</p>
          <p><strong>3位:</strong> ${s(d.awards.thirdPlace)}</p>
          <p><strong>個人賞:</strong> ${s(d.awards.individualAwards)}</p>
        </section>
        <section><h2>参加費</h2>
          <p><strong>金額:</strong> ${s(d.participationFee.amount)}</p>
          <p><strong>支払方法:</strong> ${s(d.participationFee.paymentMethod)}</p>
          <p><strong>備考:</strong></p>${pre(d.participationFee.paymentNotes)}
        </section>
        <section class="full-width"><h2>注意事項</h2>
          <p><strong>駐車場:</strong> ${s(d.generalNotes.parkingInfo)}</p>
          <p><strong>観戦エリア:</strong> ${s(d.generalNotes.spectatorArea)}</p>
          <p><strong>キャンセル規定:</strong> ${s(d.generalNotes.cancellationPolicy)}</p>
        </section>
        <section class="full-width"><h2>緊急連絡先</h2>
          <p><strong>担当者:</strong> ${s(d.contactInfo.personName)}</p>
          <p><strong>電話番号:</strong> ${s(d.contactInfo.phoneNumber)}</p>
        </section>
      </div>

      ${fixtureHtml ? `<div class="page-break"></div>${fixtureHtml}` : ''}
    `;
  };

  const styles = `
    /* (省略: 先ほどと同じスタイル定義) */
  `;

  return {
    html: buildHtml(data),
    styles
  };
};
