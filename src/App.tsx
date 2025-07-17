// src/App.tsx
import React, { useState, useCallback } from 'react';
import TeamManagementPage from './components/TeamManagementPage';
import TournamentGuidelinesPage from './components/TournamentGuidelinesPage';
import MatchesPage from './components/MatchesPage';
import { Team, Match, ChatThread, ChatMessage, TournamentInfoFormData } from './types';

const App: React.FC = () => {
  // --- アプリ全体で使うステート ---
  const [teams, setTeams] = useState<Team[]>([]);                  // 全チーム一覧
  const [managedTeam, setManagedTeam] = useState<Team | null>(null); // 自チーム
  const [matches, setMatches] = useState<Match[]>([]);             // すべての試合
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]); // チャットスレッドリスト
  const [selectedGuidelineMatchId, setSelectedGuidelineMatchId] = useState<string | null>(null); // 編集対象の要項 matchId

  // --- handler ---
  const handleUpdateTeam = useCallback((updated: Team) => {
    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (managedTeam?.id === updated.id) setManagedTeam(updated);
  }, [managedTeam]);

  const handleUpdateMatches = useCallback((updater: React.SetStateAction<Match[]>) => {
    setMatches(updater);
  }, []);

  const handleSaveNewGuidelineAsNewMatch = useCallback((newMatch: Match) => {
    setMatches(prev => [...prev, newMatch]);
  }, []);

  const handleUpdateGuidelineForMatch = useCallback((matchId: string, data: TournamentInfoFormData) => {
    setMatches(prev =>
      prev.map(m =>
        m.id === matchId ? { ...m, detailedTournamentInfo: data } : m
      )
    );
  }, []);

  const handleAddChatThread = useCallback(
    (thread: ChatThread, _initialMessage?: ChatMessage, _shouldNavigate?: boolean) => {
      setChatThreads(prev => [...prev, thread]);
    },
    []
  );

  const handleSendMessage = useCallback((threadId: string, message: ChatMessage) => {
    setChatThreads(prev =>
      prev.map(th =>
        th.id === threadId
          ? { ...th, lastMessage: message }
          : th
      )
    );
  }, []);

  // --- 初期データ読み込み (例) ---
  // useEffect(() => {
  //   fetch('/api/teams').then(...).then(setTeams);
  //   fetch('/api/matches').then(...).then(setMatches);
  // }, []);

  if (!managedTeam && teams.length > 0) {
    // とりあえず最初のチームを自チームに設定
    setManagedTeam(teams[0]);
  }

  return (
    <div className="app-container">
      {/* MatchesPage */}
      {managedTeam && (
        <MatchesPage
          matches={matches}
          teams={teams}
          onUpdateMatches={handleUpdateMatches}
          managedTeam={managedTeam}
          followedTeams={[]}  // フォロー中チームがあれば渡す
          chatThreads={chatThreads}
          onAddChatThread={handleAddChatThread}
          onSendMessage={handleSendMessage}
          onUpdateTeams={setTeams}
          onEditGuideline={(matchId: string) => setSelectedGuidelineMatchId(matchId)}
        />
      )}

      {/* TeamManagementPage */}
      {managedTeam && (
        <TeamManagementPage
          team={managedTeam}
          onUpdateTeam={team => {
            handleUpdateTeam(team);
            setManagedTeam(team);
          }}
          allTeams={teams}
          matches={matches}
        />
      )}

      {/* TournamentGuidelinesPage */}
      {managedTeam && (
        <TournamentGuidelinesPage
          allMatches={matches}
          selectedMatchId={selectedGuidelineMatchId}
          managedTeam={managedTeam}
          onSaveGuidelineAsNewMatch={handleSaveNewGuidelineAsNewMatch}
          onUpdateGuidelineForMatch={handleUpdateGuidelineForMatch}
          chatThreads={chatThreads}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default App;
