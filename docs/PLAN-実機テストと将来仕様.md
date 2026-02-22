# 実機iPhoneテストと将来仕様のプラン

## 前提

- 現状: Expo 54（managed）、Web で動作確認済み。`ios/` は未生成。
- 将来仕様で「プロトタイプでは不要」とされているものは、**実機テスト〜プロトタイプ完了のあと**に順次検討する。

---

## Phase 1: 実機iPhoneでテストできるようにする（最優先）

**目的**: 今のアプリを自分のiPhoneで触れるようにする。まだ「本物の通知」や「ウィジェット」は不要。

### 方針: まずは **Expo Go** で十分

- このプロジェクトは **expo-notifications** 等のネイティブ追加モジュールを使っていないため、**Expo Go** のままで実機実行可能。
- 実機から接続するには **Tunnel モード** を使うと確実（同じ Wi‑Fi でも LAN でつながらない環境が多いため）。Tunnel なら Mac と iPhone が別ネットワークでも接続できる。

### 手順イメージ

1. **iPhone**
   - App Store から **Expo Go** をインストール（SDK 54 対応版）。
   - 参考: [Install Expo Go for SDK 54 (iOS)](https://expo.dev/go?sdkVersion=54&platform=ios&device=true)

2. **Mac（プロジェクトをクローンしているマシン）**
   - ターミナルでプロジェクト直下へ移動。
   - `npm install`（未実施なら）。
   - **Tunnel で起動**: `npm run start:tunnel` または `npx expo start --tunnel` で開発サーバー起動。
   - ターミナルに表示される URL（例: `Metro waiting on exp://1qalxro-kenta0015-8081.exp.direct`）の **`exp://…` の部分**をコピーする。

3. **iPhone でアプリを開く（Tunnel のときはこちらが確実）**
   - **Safari** を開く。
   - アドレスバーにコピーした URL（`exp://xxxxx.exp.direct`）を貼り付けてアクセスする。
   - 「Expo Go で開きますか？」などと出たら **開く** を選ぶ → Life Hack Reminder が Expo Go で起動する。
   - ※ QR コードスキャンだと「Could not connect to development server」になることがあるため、Tunnel 利用時は **Safari に URL を貼って開く方法** を推奨。

4. **補足**
   - 同じ Wi‑Fi で LAN 接続が使える環境なら、`npm start`（Tunnel なし）でも接続できる場合がある。つながらない場合は Tunnel を使う。

### Phase 1 実行チェックリスト

| # | やること | 状態 |
|---|----------|------|
| 1 | iPhone に Expo Go（SDK 54）をインストール | ☐ |
| 2 | ターミナルでプロジェクト直下に移動 `cd /path/to/Reminder-Life-Hack` | ☐ |
| 3 | `npm install` を実行（未実施なら） | ☐ |
| 4 | **`npm run start:tunnel`** で開発サーバーを起動（Tunnel モード） | ☐ |
| 5 | ターミナルに表示された URL（`exp://xxxxx.exp.direct`）をコピーし、**iPhone の Safari** のアドレスバーに貼り付けてアクセス → Expo Go で開く | ☐ |
| 6 | アプリが開いたら、一覧・追加・編集・削除・配信シミュレート・YES/NO/SKIP を試す | ☐ |

**補足**
- 実機から開くには **Tunnel が確実**なので、通常は **`npm run start:tunnel`** を使う。
- Tunnel 利用時は **QR コードより「Safari に exp://… の URL を貼って開く」方がつながりやすい**。QR だと「Could not connect to development server」になることがある。
- 同じ Wi‑Fi で LAN が使える場合のみ `npm start`（Tunnel なし）を試してよい。
- `npm start` は tsconfig の自動上書きを防ぐために `EXPO_NO_TYPESCRIPT_SETUP=1` を付けてある。
- アイコン・スプラッシュ用の画像（`assets/images/`）がない場合は起動時に警告が出ることがある。その場合は仮の画像を配置するか、警告のまま動作確認してもよい。

### 補足

- Replit 用に `app.json` の `expo-router` で `origin` が設定されていても、**実機の Expo Go ではそのまま動く**想定。不具合が出た場合だけ origin をローカル用に変更する検討でよい。
- **配信シミュレート** はこれまでどおり手動トリガー。実機でも「配信シミュレート」ボタンでドーン画面まで確認できる。

### ここまでで「完了」とするもの

- 実機で一通り画面遷移・追加・編集・削除・配信シミュレート・YES/NO/SKIP が試せる状態。
- この時点では **本物のローカル通知・ウィジェット・タグ/カテゴリ** には手を付けない。

---

## Phase 2 以降: 将来仕様（順序と方針）

Phase 1 ができたあと、必要に応じて次の順で検討する。**まだ実装は進めない。**

| 順番 | 項目 | 仕様の位置づけ | 実装方針（いつかやる場合） |
|------|------|----------------|----------------------------|
| 1 | **本物のローカル通知** | プロトタイプでは手動トリガーでOK。将来「月・水・金 9:00」等で本当に通知を飛ばす。 | **Development Build（または EAS Build）が必須**。Expo Go だけでは実通知は制限される。※ ステップ1で `expo-notifications` を導入済み（`app.json` の `plugins` に追加）。 |
| 2 | **ホーム画面ウィジェット（画像ドーン）** | 仕様「将来」。アプリを開かずにホームで想起。 | 公式 expo-widgets は未使用。**@bittingz/expo-widgets** または **@bacons/apple-targets** で Swift ウィジェット＋App Group を想定。詳細は [調査-ホーム画面ウィジェット.md](./調査-ホーム画面ウィジェット.md) を参照。 |
| 3 | **タグ/カテゴリ** | プロトタイプでは不要。 | データモデル（Life Card / Nudge / Playbook に `tags` 等）と一覧・フィルタUIの追加。通知・ウィジェットよりは実装難易度は低いが、仕様上後回しでよい。 |

### 依存関係の整理

- **ローカル通知**: 実機で「本当に通知が来る」を試すには、Expo Go を卒業して **Development Build**（または EAS Build）を作成する必要がある。Expo Go では実通知は制限される。
- **ウィジェット**: 同じくネイティブ（Widget Extension）が必要なので、Development Build / EAS Build が前提。
- **タグ/カテゴリ**: ネイティブ必須ではない。アプリのデータとUIの拡張だけで対応可能。

**本物のローカル通知を試す場合**: **Development Build（または EAS Build）が必須**。Expo Go では実通知は制限される。ステップ1で `expo-notifications` を導入済み（`app.json` の `plugins` に追加）。ホーム画面に「**テスト通知（10秒後）**」ボタンを追加済み。実機で以下を実行すると通知が届くか確認できる。

#### ローカル通知の実機テスト手順（方法B）

1. **prebuild でネイティブを更新**  
   プロジェクト直下で `npx expo prebuild --clean` を実行。expo-notifications の権限などが `ios/` に反映される。既存の `ios/.xcode.env.updates` などカスタムがある場合は prebuild 後に必要に応じて再設定。

2. **Xcode で実機ビルド**  
   `ios/LifeHackReminder.xcworkspace` を Xcode で開く。Signing & Capabilities で Team を設定し、実機を選んで Run。Metro は別ターミナルで `npm start` を実行しておく（実機用に `ios/.xcode.env.updates` で `unset SKIP_BUNDLING` 等を設定している場合はそのまま）。

3. **アプリでテスト**  
   ホーム画面の「**テスト通知（10秒後）**」をタップ。初回は通知の許可を求められるので「許可」。約10秒後に「Life Hack Reminder / テスト通知です…」が届けばOK。アプリを閉じたりバックグラウンドにしても届く。

そのため、**実装するなら** 論理的な順序は:

1. 実機で Expo Go まで（Phase 1）← **今やること**
2. 本物の通知を実機で試したい → Development Build 導入 → `expo-notifications` でローカル通知
3. ホーム画面で「画像ドーン」をやりたい → 上記の上に WidgetKit を追加
4. コンテンツを整理したい → タグ/カテゴリのデータ＋UI

---

## まとめ（やること・やらないこと）

- **今やる**: Phase 1 のみ。  
  - Expo Go を入れ、Mac で `npx expo start` → iPhone で QR スキャンし、実機で操作確認する。
- **先に進まない**: ローカル通知・ウィジェット・タグ/カテゴリの実装は行わず、上記の「順序と方針」だけをプランとして持っておく。

このプランに沿って進めれば、実機iPhoneでテストできる状態を最短で作りつつ、将来仕様も無理なく並べられます。
