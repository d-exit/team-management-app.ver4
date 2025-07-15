import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage, ChatThread, Match, MatchStatus, MatchType, Team, TournamentInfoFormData } from '../types';
import { deepClone } from '../utils/deepClone';
import { formatGuidelineWithFixturesForChat } from '../utils/guidelineFormatter';
import { prepareTournamentPDFContent } from '../utils/pdfGenerator';

// Initial state for the form, ensures all fields are defined.
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

// Reusable input component for consistency
const FormInput: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: 'text' | 'date' | 'time' | 'textarea';
  placeholder?: string;
  rows?: number;
}> = ({ label, name, value, onChange, type = 'text', placeholder = '', rows = 3 }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">
      {label}
    </label>
    {type === 'textarea' ? (
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
      />
    ) : (
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
      />
    )}
  </div>
);

interface TournamentGuidelinesPageProps {
  allMatches: Match[];
  selectedMatchId: string | null;
  managedTeam: Team;
  onSaveGuidelineAsNewMatch: (newMatch: Match) => void;
  onUpdateGuidelineForMatch: (matchId: string, guidelineData: TournamentInfoFormData) => void;
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
  const isEditMode = !!selectedMatchId;

  const pastGuidelines = useMemo(
    () =>
      allMatches
        .filter((m) => m.detailedTournamentInfo?.eventName)
        .map((m) => ({ id: m.id, name: m.detailedTournamentInfo!.eventName })),
    [allMatches]
  );

  useEffect(() => {
    const matchToEdit = selectedMatchId
      ? allMatches.find((m) => m.id === selectedMatchId)
      : null;
    if (matchToEdit) {
      if (matchToEdit.detailedTournamentInfo) {
        setFormData(deepClone(matchToEdit.detailedTournamentInfo));
      } else {
        const newGuideline = deepClone(initialFormData);
        newGuideline.eventName = matchToEdit.location || '';
        newGuideline.eventDateTime.eventDate = matchToEdit.date;
        newGuideline.eventDateTime.startTime = matchToEdit.time;
        setFormData(newGuideline);
      }
    } else {
      const savedDraftString = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraftString) {
        try {
          const savedDraft = JSON.parse(savedDraftString);
          setFormData({ ...initialFormData, ...savedDraft });
        } catch {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } else {
        setFormData(initialFormData);
      }
    }
  }, [selectedMatchId, allMatches]);

  useEffect(() => {
    if (!isEditMode) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, isEditMode]);

  const handleCopyGuideline = (matchId: string) => {
    if (!matchId) return setFormData(initialFormData);
    const matchToCopy = allMatches.find((m) => m.id === matchId);
    if (matchToCopy?.detailedTournamentInfo) {
      setFormData({ ...initialFormData, ...deepClone(matchToCopy.detailedTournamentInfo) });
      alert(`「${matchToCopy.detailedTournamentInfo.eventName}」の要項をコピーしました。`);
    }
  };

  const handleSave = () => {
    if (!formData.eventName.trim()) return alert('「大会名」は必須です。');
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

  const handleSimpleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleNestedChange = useCallback(
    (parentKey: keyof TournamentInfoFormData, childKey: string, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [parentKey]: { ...(prev[parentKey] as any), [childKey]: value },
      }));
    },
    []
  );

  const handleGeneratePreview = () => {
    if (!formData.eventName.trim()) return alert('「大会名」は必須です。');
    const matchForFixtures = selectedMatchId
      ? allMatches.find((m) => m.id === selectedMatchId)
      : undefined;
    const bracket = matchForFixtures?.leagueCompetitionData?.finalRoundTournament || matchForFixtures?.bracketData;
    const league = matchForFixtures?.leagueCompetitionData?.preliminaryRound;
    const { html, styles } = prepareTournamentPDFContent(formData, bracket, league);
    setPreviewSrcDoc(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>プレビュー</title><style>${styles}</style></head><body>${html}</body></html>`);
    setPreviewKey((k) => k + 1);
    setShowPreview(true);
  };

  const handlePrintFromPreview = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewSrcDoc('');
  };

  const handleResetForm = () => {
    if (window.confirm('フォームをリセットしますか？入力内容は失われます。')) {
      setFormData(initialFormData);
      !isEditMode && localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  };

  const handleShareGuidelineToChat = (threadId: string) => {
    const matchForFixtures = selectedMatchId
      ? allMatches.find((m) => m.id === selectedMatchId)
      : undefined;
    const bracket = matchForFixtures?.leagueCompetitionData?.finalRoundTournament || matchForFixtures?.bracketData;
    const league = matchForFixtures?.leagueCompetitionData?.preliminaryRound;
    const text = formatGuidelineWithFixturesForChat(formData, bracket, league);
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId,
      senderId: managedTeam.id,
      senderName: managedTeam.name,
      text,
      timestamp: new Date(),
    };
    onSendMessage(threadId, message);
    alert('チャットに要項を共有しました。');
    setShowShareModal(false);
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <fieldset className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
      <legend className="text-lg font-semibold text-sky-400 px-2">{title}</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">{children}</div>
    </fieldset>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-3xl font-semibold text-sky-300">
          {isEditMode ? '大会要項編集' : '大会要項作成'}
        </h2>
        <div className="flex gap-3">
          <button onClick={handleResetForm} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-lg">
            リセット
          </button>
          <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg">
            {isEditMode ? '更新' : '保存'}
          </button>
          <button onClick={() => setShowShareModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg">
            チャットで共有
          </button>
          <button onClick={handleGeneratePreview} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg">
            PDFプレビュー
          </button>
        </div>
      </header>

      <section className="bg-slate-800 p-4 rounded-xl">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          過去の要項をコピーして作成
        </label>
        <select
          onChange={(e) => handleCopyGuideline(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded-md"
          disabled={isEditMode}
        >
          <option value="">新規作成</option>
          {pastGuidelines.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {isEditMode && <p className="text-xs text-yellow-400 mt-1">編集中はコピー不可</p>}
      </section>

      <div className="space-y-6">
        {renderSection('大会基本情報', <>
          <FormInput label="大会名" name="eventName" value={formData.eventName} onChange={handleSimpleChange} />
          <FormInput label="主催団体名" name="organizationName" value={formData.organizerInfo.organizationName} onChange={(e) => handleNestedChange('organizerInfo', 'organizationName', e.target.value)} />
          <FormInput label="主催担当者名" name="contactPersonName" value={formData.organizerInfo.contactPersonName} onChange={(e) => handleNestedChange('organizerInfo', 'contactPersonName', e.target.value)} />
          <FormInput label="参加チーム（改行区切り）" name="participatingTeams" type="textarea" value={formData.participatingTeams} onChange={handleSimpleChange} />
        </>)}
        {/* Repeat renderSection for other groups as in original */}
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
            <header className="flex justify-between items-center p-3 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-sky-300">プレビュー</h3>
              <div className="flex gap-2">
                <button onClick={handlePrintFromPreview} className="bg-sky-500 hover:bg-sky-600 text-white py-1 px-3 rounded">
                  印刷
                </button>
                <button onClick={handleClosePreview} className="bg-slate-600 hover:bg-slate-500 text-white py-1 px-3 rounded">
                  閉じる
                </button>
              </div>
            </header>
            <iframe
              key={previewKey}
              ref={iframeRef}
              title="プレビュー"
              srcDoc={previewSrcDoc}
              className="flex-grow border-0 bg-white"
            />
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-2xl text-sky-400 mb-4">チャットで共有</h3>
            <p className="text-sm text-slate-400 mb-3">どのチャットに要項を共有しますか？</p>
            <div className="space-y-2 overflow-y-auto max-h-60">
              {chatThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleShareGuidelineToChat(thread.id)}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 text-white p-3 rounded"
                >
                  {thread.isGroupChat ? thread.groupName : thread.participants.find((p) => p.id !== managedTeam.id)?.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowShareModal(false)} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded">
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
