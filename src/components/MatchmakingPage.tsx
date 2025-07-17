// src/components/MatchmakingPage.tsx
import React, { useState, useMemo } from 'react';
import { Team, TeamLevel } from '../types';

interface MatchmakingPageProps {
  allTeams: Team[];                   // マッチング対象の全チーム
  onFollowTeam: (team: Team) => void; // チームをフォロー
  followedTeamIds: string[];          // フォロー済みチームID一覧
  onSelectTeam: (team: Team) => void; // チーム選択ハンドラ
}

// 都道府県リスト
const prefectures = ['東京都', '大阪府', '福岡県', '北海道', '神奈川県'];

// レベル（TeamLevel の列挙値をそのまま使う）
const teamLevels = Object.values(TeamLevel) as TeamLevel[];

// 年齢カテゴリ
const ageCategories: Array<'U-10' | 'U-12' | 'U-15' | '一般'> = [
  'U-10', 'U-12', 'U-15', '一般'
];

// フィルター状態の型（すべて必須にする）
type FilterState = {
  prefecture: string[];
  level: TeamLevel[];
  ageCategory: Array<'U-10' | 'U-12' | 'U-15' | '一般'>;
  ratingMin: number;
  ratingMax: number;
};

const MatchmakingPage: React.FC<MatchmakingPageProps> = ({
  allTeams,
  onFollowTeam,
  followedTeamIds,
  onSelectTeam,
}) => {
  // フィルター初期値
  const [filters, setFilters] = useState<FilterState>({
    prefecture: [],
    level: [],
    ageCategory: [],
    ratingMin: 0,
    ratingMax: 9999,
  });

  const [availableDateFilter, setAvailableDateFilter] = useState<string>('');

  // 多選択フィルター切替
  const handleMultiSelectChange = (
    field: keyof Omit<FilterState, 'ratingMin' | 'ratingMax'>,
    value: string
  ) => {
    setFilters(prev => {
      const list = prev[field] as string[];
      const updated = list.includes(value)
        ? list.filter(v => v !== value)
        : [...list, value];
      return { ...prev, [field]: updated };
    });
  };

  // レーティング範囲変更
  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value ? parseInt(value, 10) : prev[name as 'ratingMin' | 'ratingMax'],
    }));
  };

  // おすすめチームを絞り込み
  const recommendedTeams = useMemo(() => {
    return allTeams.filter(team => {
      const matchPref    = filters.prefecture.length === 0 || filters.prefecture.includes(team.prefecture || '');
      const matchLevel   = filters.level.length === 0 || filters.level.includes(team.level);
      const matchAge     = filters.ageCategory.length === 0 || filters.ageCategory.includes(team.ageCategory || '一般');
      const matchMin     = team.rating >= filters.ratingMin;
      const matchMax     = team.rating <= filters.ratingMax;
      const text         = team.availableSlotsText || '';
      const matchDate    = !availableDateFilter || ['空き', '週末のみ空き'].includes(text);
      return matchPref && matchLevel && matchAge && matchMin && matchMax && matchDate;
    });
  }, [allTeams, filters, availableDateFilter]);

  // フィルタータグ
  const FilterTag: React.FC<{
    label: string;
    value: string;
    onRemove?: () => void;
    compact?: boolean;
  }> = ({ label, value, onRemove, compact }) => (
    <span
      className={`inline-flex items-center rounded-full bg-sky-700 text-sky-200 font-medium ${
        compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
      }`}
    >
      {label}：{value}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 text-sm hover:text-white">
          ✕
        </button>
      )}
    </span>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-sky-300">チームマッチング</h2>

      {/* フィルター入力 */}
      <div className="bg-slate-800 p-4 rounded-xl shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 都道府県 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">都道府県</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {prefectures.map(pref => (
                <label key={pref} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.prefecture.includes(pref)}
                    onChange={() => handleMultiSelectChange('prefecture', pref)}
                    className="form-checkbox"
                  />
                  <span>{pref}</span>
                </label>
              ))}
            </div>
          </div>
          {/* レベル */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">レベル</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {teamLevels.map(lv => (
                <label key={lv} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.level.includes(lv)}
                    onChange={() => handleMultiSelectChange('level', lv)}
                    className="form-checkbox"
                  />
                  <span>{lv}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 年齢カテゴリ */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">年齢カテゴリ</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {ageCategories.map(age => (
                <label key={age} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.ageCategory.includes(age)}
                    onChange={() => handleMultiSelectChange('ageCategory', age)}
                    className="form-checkbox"
                  />
                  <span>{age}</span>
                </label>
              ))}
            </div>
          </div>
          {/* レーティング */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">レーティング</h3>
            <div className="flex space-x-2">
              <input
                type="number"
                name="ratingMin"
                value={filters.ratingMin}
                onChange={handleRatingChange}
                className="w-1/2 p-1 bg-slate-700 rounded text-sm"
                placeholder="最小"
              />
              <input
                type="number"
                name="ratingMax"
                value={filters.ratingMax}
                onChange={handleRatingChange}
                className="w-1/2 p-1 bg-slate-700 rounded text-sm"
                placeholder="最大"
              />
            </div>
          </div>
          {/* 空き日程 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">空き日程</h3>
            <input
              type="date"
              value={availableDateFilter}
              onChange={e => setAvailableDateFilter(e.target.value)}
              className="w-full p-1 bg-slate-700 rounded text-sm text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* 選択中のタグ */}
      <div className="flex flex-wrap gap-2">
        {filters.prefecture.map(p => (
          <FilterTag
            key={p}
            label="県"
            value={p}
            onRemove={() => handleMultiSelectChange('prefecture', p)}
            compact
          />
        ))}
        {filters.level.map(lv => (
          <FilterTag
            key={lv}
            label="Lv"
            value={lv}
            onRemove={() => handleMultiSelectChange('level', lv)}
            compact
          />
        ))}
        {filters.ageCategory.map(age => (
          <FilterTag
            key={age}
            label="年齢"
            value={age}
            onRemove={() => handleMultiSelectChange('ageCategory', age)}
            compact
          />
        ))}
        {availableDateFilter && (
          <FilterTag
            label="日付"
            value={availableDateFilter.replace(/^\d{4}-/, '')}
            onRemove={() => setAvailableDateFilter('')}
            compact
          />
        )}
      </div>

      {/* おすすめチーム一覧 */}
      <h3 className="text-2xl font-semibold text-sky-300">
        おすすめチーム（{recommendedTeams.length}件）
      </h3>
      {recommendedTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recommendedTeams.map(team => (
            <div
              key={team.id}
              className="bg-slate-800 rounded-lg shadow flex flex-col"
            >
              <div
                className="h-24 w-full overflow-hidden cursor-pointer"
                onClick={() => onSelectTeam(team)}
              >
                <img
                  src={team.logoUrl}
                  alt={`${team.name}のロゴ`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 flex flex-col flex-grow">
                <h4
                  className="text-lg font-semibold text-sky-300 truncate cursor-pointer"
                  onClick={() => onSelectTeam(team)}
                >
                  {team.name}
                </h4>
                <div className="flex flex-wrap gap-1 mt-2 mb-4">
                  <FilterTag label="県" value={team.prefecture || '-'} compact />
                  <FilterTag label="Lv" value={team.level} compact />
                  <FilterTag
                    label="年齢"
                    value={team.ageCategory || '一般'}
                    compact
                  />
                  <FilterTag label="R" value={String(team.rating)} compact />
                  <FilterTag
                    label="空き"
                    value={team.availableSlotsText || '-'}
                    compact
                  />
                </div>
                <button
                  onClick={() => onFollowTeam(team)}
                  disabled={followedTeamIds.includes(team.id)}
                  className={`mt-auto py-2 rounded ${
                    followedTeamIds.includes(team.id)
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {followedTeamIds.includes(team.id) ? 'フォロー済み' : 'フォローする'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-400 py-10">
          条件に合うチームがいません。
        </p>
      )}
    </div>
  );
};

export default MatchmakingPage;
