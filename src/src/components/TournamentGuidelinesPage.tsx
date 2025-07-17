// src/components/TournamentGuidelinesPage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChatMessage,
  ChatThread,
  Match,
  MatchStatus,
  MatchType,
  Team,
  TournamentInfoFormData
} from '../types';
import { deepClone } from '../utils/deepClone';
import { formatGuidelineWithFixturesForChat } from '../utils/guidelineFormatter';
import { prepareTournamentPDFContent } from '../utils/pdfGenerator';

// フォームの初期値
const initialFormData: TournamentInfoFormData = {
  eventName: '',
  organizerInfo: { organizationName: '', contactPersonName: '' },
  eventDateTime: { eventDate: '', startTime: '', endTime: '', entryTime: '' },
  venueInfo: { facilityName: '', address: '' },
  participantEligibility: { gradeLevel: '', ageLimit: '' },
  participatingTeams: '',
  courtInfo: { size: '', numberOfCourts: '' },
  matchFormat: { playersPerTeam: '', goalSpecifications: '' },
  refereeSystem: '',
  competitionRules: '',
  matchSchedule: { ceremonyInfo: '', waterBreakInfo: '' },
  ballInfo: '',
  rankingMethod: { pointsRule: '', tieBreakerRule: '', leagueSystemDescription: '' },
  awards: { winner: '', runnerUp: '', thirdPlace: '', individualAwards: '' },
  participationFee: { amount: '', paymentMethod: '', paymentNotes: '' },
  generalNotes: { parkingInfo: '', spectatorArea: '', cancellationPolicy: '' },
  contactInfo: { personName: '', phoneNumber: '' },
};

const DRAFT_STORAGE_KEY = 'tournamentGuidelinesDraft';

interface TournamentGuidelinesPageProps {
  allMatches: Match[];
  selectedMatchId: string | null;
  managedTeam: Team;
  onSaveGuidelineAsNewMatch: (newMatch: Match) => void;
  onUpdateGuidelineForMatch: (matchId: string, data: TournamentInfoFormData) => void;
  chatThreads: ChatThread[];
  onSendMessage: (threadId: string, message: ChatMessage) => void;
}

const TournamentGuidelinesPage: React.FC<TournamentGuidelinesPageProps> = ({
  allMatches,
  selectedMatchId,
  managedTeam,
  onSaveGuidelineAsNewMatch,
  onUpdateGuidelineForMatch,
  chatThreads,
  onSendMessage,
}) => {
  const [formData, setFormData] = useState<TournamentInfoFormData>(initialFormData);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSrcDoc, setPreviewSrcDoc] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isEditMode = Boolean(selectedMatchId);

  // 過去の要項リストを作成
  const pastGuidelines = useMemo(
    () =>
      allMatches
        .filter(m => m.detailedTournamentInfo?.eventName)
        .map(m => ({ id: m.id, name: m.detailedTournamentInfo!.eventName })),
    [allMatches]
  );

  // 編集モード or 新規モードでフォームを初期化
  useEffect(() => {
    if (isEditMode) {
      const match = allMatches.find(m => m.id === selectedMatchId);
      if (match && match.detailedTournamentInfo) {
        setFormData(deepClone(match.detailedTournamentInfo));
        return;
      }
    }
    // 新規モードならローカルストレージの下書きを復元
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      try {
        setFormData(prev => ({ ...prev, ...JSON.parse(draft) }));
      } catch {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } else {
      setFormData(initialFormData);
    }
  }, [selectedMatchId, allMatches, isEditMode]);

  // 新規モードではフォームのたびにローカルストレージへ保存
  useEffect(() => {
    if (!isEditMode) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, isEditMode]);

  const handleSimpleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleNestedChange = useCallback(
    (parent: keyof TournamentInfoFormData, child: string, value: string) => {
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev[parent] as any), [child]: value }
      }));
    },
    []
  );

  // 過去要項コピー
  const handleCopyGuideline = (id: string) => {
    if (!id) return setFormData(initialFormData);
    const match = allMatches.find(m => m.id === id);
    if (match?.detailedTournamentInfo) {
      setFormData(deepClone(match.detailedTournamentInfo));
      alert(`「${match.detailedTournamentInfo.eventName}」をコピーしました。`);
    }
  };

  // 保存
  const handleSave = () => {
    if (!formData.eventName.trim()) {
      alert('大会名は必須です。');
      return;
    }
    if (isEditMode) {
      onUpdateGuidelineForMatch(selectedMatchId!, formData);
    } else {
      const newMatch: Match = {
        id: `match-${Date.now()}`,
        type: MatchType.TOURNAMENT,
        status: MatchStatus.PREPARATION,
        ourTeamId: managedTeam.id,
        date: formData.eventDateTime.eventDate || new Date().toISOString().split('T')[0],
        time: formData.eventDateTime.startTime || '09:00',
        location: formData.eventName,
        detailedTournamentInfo: formData,
      };
      onSaveGuidelineAsNewMatch(newMatch);
    }
  };

  // PDF プレビュー生成
  const handleGeneratePreview = () => {
    if (!formData.eventName.trim()) {
      alert('大会名は必須です。');
      return;
    }
    const match = allMatches.find(m => m.id === selectedMatchId!)!;
    const bracket = match?.leagueCompetitionData?.finalRoundTournament || match?.bracketData;
    const league = match?.leagueCompetitionData?.preliminaryRound;
    const { html, styles } = prepareTournamentPDFContent(formData, bracket, league);
    setPreviewSrcDoc(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>${html}</body></html>`
    );
    setPreviewKey(k => k + 1);
    setShowPreview(true);
  };

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  // チャット共有
  const handleShare = (threadId: string) => {
    const match = allMatches.find(m => m.id === selectedMatchId!)!;
    const bracket = match?.leagueCompetitionData?.finalRoundTournament || match?.bracketData;
    const league = match?.leagueCompetitionData?.preliminaryRound;
    const text = formatGuidelineWithFixturesForChat(formData, bracket, league);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId,
      senderId: managedTeam.id,
      senderName: managedTeam.name,
      text,
      timestamp: new Date()
    };
    onSendMessage(threadId, msg);
    alert('チャットに共有しました。');
    setShowShareModal(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl text-sky-300 font-semibold">
          {isEditMode ? '大会要項編集' : '大会要項作成'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFormData(initialFormData);
              !isEditMode && localStorage.removeItem(DRAFT_STORAGE_KEY);
            }}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded"
          >
            リセット
          </button>
          <button
            onClick={handleSave}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded"
          >
            保存
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded"
          >
            チャット共有
          </button>
          <button
            onClick={handleGeneratePreview}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            PDFプレビュー
          </button>
        </div>
      </header>

      {/* 過去要項コピー */}
      <section className="bg-slate-800 p-4 rounded">
        <label className="block text-sm text-slate-300 mb-1">過去要項をコピー</label>
        <select
          onChange={e => handleCopyGuideline(e.target.value)}
          disabled={isEditMode}
          className="w-full bg-slate-700 text-white p-2 rounded"
        >
          <option value="">新規作成</option>
          {pastGuidelines.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {isEditMode && (
          <p className="text-sm text-yellow-400 mt-1">編集モード中はコピーできません</p>
        )}
      </section>

      {/* ここに適宜 FormInput コンポーネントを並べてください */}
      {/* 例: 大会名、主催情報、日時、会場、参加資格、参加チーム、コート情報、ルール、賞、連絡先 など */}

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg overflow-hidden w-full max-w-4xl h-5/6 flex flex-col">
            <header className="flex justify-between items-center p-2 bg-slate-700">
              <h3 className="text-lg text-white">プレビュー</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded">
                  印刷
                </button>
                <button onClick={() => setShowPreview(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded">
                  閉じる
                </button>
              </div>
            </header>
            <iframe
              key={previewKey}
              ref={iframeRef}
              srcDoc={previewSrcDoc}
              className="flex-grow border-0"
            />
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl text-sky-300 mb-4">チャットで共有</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {chatThreads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => handleShare(thread.id)}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 text-white p-3 rounded"
                >
                  {thread.isGroupChat
                    ? thread.groupName
                    : thread.participants.find(p => p.id !== managedTeam.id)?.name}
                </button>
              ))}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowShareModal(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentGuidelinesPage;
