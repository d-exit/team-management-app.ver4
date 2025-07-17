// src/App.tsx
// チーム管理アプリケーションのメインエントリーポイント
import React, { useCallback, useMemo, useState } from 'react';
import ChatPage from '@/components/ChatPage';
import ChatScreen from '@/components/ChatScreen';
import FollowedTeamsPage from '@/components/FollowedTeamsPage';
import MatchesPage from '@/components/MatchesPage';
import MatchmakingPage from '@/components/MatchmakingPage';
import SchedulePage from '@/components/SchedulePage';
import TeamManagementPage from '@/components/TeamManagementPage';
import TeamProfilePage from '@/components/TeamProfilePage';
import TeamSelectionPage from '@/components/TeamSelectionPage';
import TournamentGuidelinesPage from '@/components/TournamentGuidelinesPage';
import VenueBookingPage from '@/components/VenueBookingPage';
import {
  mockChatMessages,
  mockChatThreads,
  mockMatches,
  mockPastMatchResults,
  mockScheduleEvents,
  mockTeams,
  mockVenues
} from './data/mockData';
import {
  ChatMessage,
  ChatThread,
  FollowedTeam,
  Match,
  ScheduleEvent,
  Team,
  TeamLevel,
  TournamentInfoFormData,
  Venue,
  View
} from './types';

const App: React.FC = () => {
  // ========== State ==========
  const [currentView, setCurrentView] = useState<View>(View.TEAM_MANAGEMENT);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>(mockTeams);

  // 管理チームのリスト (初期は team-1 のみ)
  const [managedTeams, setManagedTeams] = useState<Team[]>(() =>
    mockTeams.filter(t => t.id === 'team-1')
  );
  // 選択中の管理チームId
  const [selectedManagedTeamId, setSelectedManagedTeamId] = useState<string | null>(null);
  const selectedManagedTeam = useMemo(
    () => managedTeams.find(t => t.id === selectedManagedTeamId) || null,
    [managedTeams, selectedManagedTeamId]
  );

  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [venues] = useState<Venue[]>(mockVenues);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(mockScheduleEvents);

  const [followedTeams, setFollowedTeams] = useState<FollowedTeam[]>(() =>
    mockTeams
      .filter(t => t.id !== 'team-1')
      .slice(0, 3)
      .map(t => ({ ...t, isFavorite: Math.random() > 0.5, logoUrl: t.logoUrl }))
  );

  const [chatThreads, setChatThreads] = useState<ChatThread[]>(mockChatThreads);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(mockChatMessages);
  const [selectedChatThreadId, setSelectedChatThreadId] = useState<string | null>(null);
  const [selectedMatchIdForGuideline, setSelectedMatchIdForGuideline] = useState<string | null>(null);

  const currentUserId = selectedManagedTeam?.id || 'user-self';

  // ========== Handlers ==========
  // マッチ更新ハンドラ
  const handleUpdateMatches = useCallback(
    (updater: React.SetStateAction<Match[]>) => {
      setMatches(updater);
    },
    []
  );

  // チーム更新ハンドラ
  const handleUpdateTeams = useCallback(
    (updater: React.SetStateAction<Team[]>) => {
      setTeams(prev => {
        const updated = typeof updater === 'function' ? updater(prev) : updater;
        setManagedTeams(mt => mt.map(t => updated.find(u => u.id === t.id) || t));
        return updated;
      });
    },
    []
  );

  // 要項編集ハンドラ
  const handleUpdateGuidelineForMatch = useCallback(
    (matchId: string, data: TournamentInfoFormData) => {
      setMatches(prev =>
        prev.map(m =>
          m.id === matchId
            ? {
                ...m,
                detailedTournamentInfo: data,
                location: data.eventName,
                // 常に文字列として設定
                date: data.eventDateTime.eventDate,
                time: data.eventDateTime.startTime
              }
            : m
        )
      );
      alert('大会要項が更新されました。');
    },
    []
  );

  // 新要項保存ハンドラ
  const handleSaveNewGuidelineAsNewMatch = useCallback((newMatch: Match) => {
    setMatches(prev =>
      [newMatch, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
    alert('大会要項が新しい試合として保存されました。');
  }, []);

  const handleSelectTeam = useCallback((team: Team) => {
    setSelectedTeam(team);
    setCurrentView(View.TEAM_PROFILE);
  }, []);

  const handleSelectManagedTeam = (id: string) => {
    setSelectedManagedTeamId(id);
    setCurrentView(View.TEAM_MANAGEMENT);
  };

  const handleCreateTeam = (name: string, coach: string) => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name,
      coachName: coach,
      logoUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
      level: TeamLevel.BEGINNER,
      rating: 1200,
      rank: 0,
      members: [],
      description: '新しいチームです。よろしくお願いします！',
      prefecture: '',
      city: '',
      ageCategory: '一般'
    };
    setManagedTeams(prev => [...prev, newTeam]);
    setTeams(prev => [...prev, newTeam]);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm('このチームを本当に削除しますか？')) {
      setManagedTeams(prev => prev.filter(t => t.id !== teamId));
    }
  };

  const handleBackToTeamSelection = () => {
    setSelectedManagedTeamId(null);
  };

  const handleEditGuidelineForMatch = (matchId: string) => {
    setSelectedMatchIdForGuideline(matchId);
    navigateTo(View.TOURNAMENT_GUIDELINES);
  };

  const navigateTo = (view: View) => {
    if (view !== View.TEAM_PROFILE) setSelectedTeam(null);
    if (view !== View.CHAT_SCREEN) setSelectedChatThreadId(null);
    if (view !== View.TOURNAMENT_GUIDELINES) setSelectedMatchIdForGuideline(null);
    setCurrentView(view);
  };

  const navigateToChatScreen = (threadId: string) => { 
    setSelectedChatThreadId(threadId); 
    setCurrentView(View.CHAT_SCREEN);
  };

  const handleAddChatThread = (thread: ChatThread, initial?: ChatMessage, nav: boolean = true) => {
    setChatThreads(prev =>
      [thread, ...prev].sort(
        (a, b) =>
          (b.lastMessage?.timestamp.getTime() || 0) - 
          (a.lastMessage?.timestamp.getTime() || 0)
      )
    );
    if (initial) setChatMessages(prev => ({ ...prev, [thread.id]: [initial] }));
    if (nav) navigateToChatScreen(thread.id);
  };

  const handleSendMessage = (threadId: string, msg: ChatMessage) => {
    setChatMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), msg] }));
    setChatThreads(prev =>
      prev
        .map(t =>
          t.id === threadId
            ? {
                ...t,
                lastMessage: msg,
                unreadCount: msg.senderId === currentUserId ? t.unreadCount : (t.unreadCount || 0) + 1
              }
            : t
        )
        .sort(
          (a, b) =>
            (b.lastMessage?.timestamp.getTime() || 0) -
            (a.lastMessage?.timestamp.getTime() || 0)
        )
    );
  };

  // 管理チーム未選択ならチーム選択ページ
  if (!selectedManagedTeam) {
    return (
      <TeamSelectionPage
        teams={managedTeams}
        onSelectTeam={handleSelectManagedTeam}
        onCreateTeam={handleCreateTeam}
        onDeleteTeam={handleDeleteTeam}
      />
    );
  }

  const currentThread = selectedChatThreadId
    ? chatThreads.find(t => t.id === selectedChatThreadId) || null
    : null;
  const messagesForThread = selectedChatThreadId
    ? chatMessages[selectedChatThreadId] || []
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4">
      {/* ヘッダー */}
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold">{selectedManagedTeam.name}</h1>
        <button onClick={handleBackToTeamSelection} className="mt-2 text-sm text-sky-300">
          &larr; チームを選び直す
        </button>
      </header>

      {/* ナビゲーション */}
      {/* NavButton を並べてください */}

      {/* メイン */}
      <main className="container mx-auto">
        {/* 各ビューをここに配置 */}
      </main>
    </div>
  );
};

export default App;
