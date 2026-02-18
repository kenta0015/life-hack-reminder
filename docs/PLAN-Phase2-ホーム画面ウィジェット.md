# Phase 2: ホーム画面ウィジェット（画像ドーン）段階的プラン

## 前提（確定済み）

- **表示する1件**: **B = 今日の1枚**。日付（デバイスローカル・カレンダー日）で1件を固定し、同じ日は同じカードを表示する。
- **画像**: **A = 共有コンテナにコピー**。メインアプリが選んだ1件の画像を App Group の共有コンテナにコピーし、ウィジェットはそのファイルパスを参照して表示する（ローカルで選んだ写真も表示可能）。
- **プラットフォーム**: **iOS のみ**。Android ウィジェットは Phase 2 の対象外。
- **確認方法**: Expo Go ではウィジェットは動かない。**development build** を行い、実機でウィジェットの追加・表示・更新を確認する。ビルドは **Xcode を開かず** に次のいずれかで可能（詳しくは「実機確認（Xcode なし）」参照）。

参照: [調査-ホーム画面ウィジェット.md](./調査-ホーム画面ウィジェット.md)

---

## ウィジェット用データ契約（共通）

App Group の **UserDefaults** に次のキーで書き出す。将来公式ウィジェットに差し替えてもこの形式を維持する。

| キー | 型 | 説明 |
|------|-----|------|
| `widgetPhrase` | string | 表示する文言（Life Card の phrase / Nudge の text / Playbook の title） |
| `widgetTitle` | string? | サブ表示用（Life Card の title、Playbook の title 等。任意） |
| `widgetType` | string | `"lifeCard"` \| `"nudge"` \| `"playbook"` |
| `widgetImagePath` | string? | **共有コンテナ内の画像ファイルパス**。画像がない場合は未設定。 |
| `widgetUpdatedAt` | number | 最終更新時刻（ミリ秒）。ウィジェットの更新トリガー用。 |

※ 調査メモの `widgetImageUrl` は、ローカル写真対応のため **`widgetImagePath`**（共有コンテナ内の path）に変更。

---

## 「今日の1枚」の選び方（B）

- **入力**: `activeItems`、**日付**（`YYYY-MM-DD`、デバイスローカル）。
- **出力**: 1件の `ActiveItem`。
- **手順例**: 日付文字列をシードにした擬似乱数で、有効なアイテムリストをシャッフルし、先頭1件を採用する。同じ日付なら同じ1件になる。
- **有効**: 削除ボックスにない・active なアイテムのみ。コールダウンは考慮しない（今日の1枚は「配信順」ではなく「日付で固定」のため）。

---

## 段階の概要

| 段階 | 内容 | 確認ポイント |
|------|------|--------------|
| **2-1** | ライブラリ選定・インストール・prebuild | SDK 54 で prebuild が通る（@bittingz または @bacons+patch） |
| **2-2** | 「今日の1枚」ロジック（JS）＋ ウィジェット用データ形式 | 日付を渡すと1件が決まる。データ構造が契約どおりになる |
| **2-3** | ネイティブ書き出しモジュール（UserDefaults ＋ 画像コピー） | JS から「1件分オブジェクト」を渡すと App Group に書き出される（実機は 2-5 で） |
| **2-4** | Swift ウィジェット（WidgetBundle・画像＋言葉ドーン） | シミュレータ or 実機でウィジェットが表示され、UserDefaults の値を反映する |
| **2-5** | App Group 新規作成・Developer 設定・実機ビルド・更新タイミング | 実機でホームにウィジェット追加、表示・日付変更時の更新が確認できる |

---

## 2-1: ライブラリ選定・インストール・prebuild

**目的**: iOS ウィジェット拡張をプロジェクトに含め、Expo 54 で prebuild が成功する状態にする。

### やること

1. **選択肢の再確認**
   - [@bittingz/expo-widgets](https://github.com/mike-stewart-dev/expo-widgets) の SDK 54 対応状況を確認（issue #68 等）。修正 or パッチがあれば @bittingz を採用。
   - 使えない場合は [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets) ＋ [issue #144 の patch-package](https://github.com/EvanBacon/expo-apple-targets/issues/144) で進める。
2. **インストールと plugin 設定**
   - 採用したパッケージをインストール。
   - `app.json` / `app.config.*` に plugin を追加: `devTeamId`、ウィジェット Swift の `src`、**App Group**（例: `group.com.kenta0015.life-hack-reminder`）。
3. **ウィジェット用 Swift のひな形**
   - `widgets/ios/`（または採用ライブラリの指定するパス）に、WidgetBundle と最小限の 1 ウィジェットを Swift で用意（表示は「Placeholder」や固定テキストでよい）。
4. **prebuild**
   - `npx expo prebuild --platform ios --clean` を実行し、エラーなく `ios/` が生成されることを確認。

### 完了目安

- `expo prebuild --platform ios` がエラーなく完了する。
- Xcode で `ios/` を開き、ウィジェットターゲットが含まれていることを確認できる。

### 2-1 実施メモ（済）

- **採用**: @bittingz は SDK 54 で Podfile 不具合のため未使用。**@bacons/apple-targets**（v4.0.3）を採用。
- **SDK 54 対応**: `with-bacons-xcode.js` の `BaseMods.withGeneratedBaseMods` / `BaseMods.provider` を `createBaseMod` の直接参照に変更。`patches/@bacons+apple-targets+4.0.3.patch` で適用（postinstall で自動適用）。
- **セットアップ**: `npx create-target widget` で `targets/widget` 作成。`app.json` に `ios.entitlements["com.apple.security.application-groups"]` と plugin 追加。`targets/widget/expo-target.config.js` で App Group・表示名「今日の1枚」・アイコン `../../assets/images/icon.png` を設定。
- **注意**: prebuild 時に `ios.appleTeamId` 未設定の警告が出る。実機ビルド前に Xcode の Signing で Team を選ぶか、`app.json` の `expo.ios.appleTeamId` に Team ID を設定すること。

---

## 2-2: 「今日の1枚」ロジック（JS）＋ ウィジェット用データ形式

**目的**: 日付から「今日の1枚」を選ぶロジックを実装し、ウィジェット用のオブジェクト（契約形式）を組み立てる。

### やること

1. **日付ベースで1件を選ぶ関数**
   - 例: `selectTodayItem(items: ActiveItem[], dateYYYYMMDD: string): ActiveItem | null`
   - 日付をシードにした擬似乱数でシャッフルし、先頭1件を返す。アイテムが0件なら `null`。
2. **ウィジェット用オブジェクトの組み立て**
   - 選ばれた1件から、次の形式のオブジェクトを作る関数を用意する。
   - `{ phrase, title?, type, imageUrl?, updatedAt }`（imageUrl はメインアプリ内の URI。ネイティブ側で共有コンテナにコピーする元パスとして使う）。
   - 契約キー名（`widgetPhrase` 等）はネイティブ書き出しモジュール側でマッピングしてよい。

### 完了目安

- 任意の日付と `activeItems` を渡すと、同じ日付では常に同じ1件が選ばれる。
- 選ばれた1件から、ウィジェット用データ（phrase / title / type / imageUri / updatedAt）が取得できる。

### 2-2 実施メモ（済）

- **lib/widget.ts** を新規作成。
  - `selectTodayItem(items, dateYYYYMMDD)`: 日付文字列のハッシュでシードした擬似乱数で Fisher–Yates シャッフルし、先頭1件を返す。
  - `getTodayDateString()`: デバイスローカルの今日を `YYYY-MM-DD` で返す。
  - `WidgetPayload` 型: `{ phrase, title?, type, imageUri?, updatedAt }`。ネイティブ側で imageUri を共有コンテナにコピーし `widgetImagePath` として保存する想定。
  - `buildWidgetPayload(item)`: 選ばれた1件から上記形式のオブジェクトを組み立てる。

---

## 2-3: ネイティブ書き出しモジュール（UserDefaults ＋ 画像コピー）

**目的**: メインアプリ（JS）から「ウィジェット用1件オブジェクト」を渡すと、App Group の UserDefaults に書き出し、画像がある場合は共有コンテナにコピーしてパスを保存する。

### やること

1. **ネイティブモジュール（Expo Module）**
   - 例: `expo-widget-bridge` のような 1 モジュールを用意（または既存モジュールにメソッド追加）。
   - API 例: `writeWidgetItem({ phrase, title, type, imageUri?, updatedAt })`
     - `phrase`, `title`, `type`, `updatedAt` を App Group の UserDefaults に書き込む。
     - `imageUri` が渡された場合: その URI のファイルを **App Group の共有コンテナ**（例: `Container/widgetImage.jpg`）にコピーし、書き込むキーは `widgetImagePath`（共有コンテナ内のフルパス）。
     - `imageUri` が無い場合: 共有コンテナ内の既存画像は削除してよい。UserDefaults の `widgetImagePath` は削除 or 空文字。
2. **呼び出しタイミング（メインアプリ側）**
   - アプリ起動時（またはフォアグラウンド復帰時）。
   - アイテムの追加・更新・削除時。
   - 上記のいずれかで「今日の1枚」を再計算し、ネイティブの `writeWidgetItem` を呼ぶ。

### 完了目安

- JS から `writeWidgetItem` を呼ぶと、実機 or シミュレータの App Group UserDefaults に値が入る。
- 画像付きアイテムを選んだ場合、共有コンテナにファイルがコピーされ、`widgetImagePath` にそのパスが入る。

### 2-3 実施メモ（済）

- **ExtensionStorage**（@bacons/apple-targets）で UserDefaults に `widgetPhrase` / `widgetTitle` / `widgetType` / `widgetUpdatedAt` / `widgetImagePath` を書き出し。
- **ローカルモジュール** `modules/expo-widget-bridge`: iOS で `copyImageToWidget(sourceUri, appGroup)`（共有コンテナに `widgetImage.jpg` としてコピー）、`clearWidgetImage(appGroup)` を提供。JS は `lib/widgetNative.ts` の `writeWidgetDataToNative(payload)` でペイロードを受け取り、ExtensionStorage と上記モジュールで書き出し後に `ExtensionStorage.reloadWidget()` を実行。
- **呼び出し**: `lib/AppContext.tsx` で初回ロード時・`updateAndSave` のたび（追加・更新・削除・復元・入れ替え）・アプリがフォアグラウンド復帰したときに「今日の1枚」を再計算し `writeWidgetDataToNative` を呼ぶ。
- **注意**: 新規モジュールを認識させるため、**`npx expo prebuild --platform ios --clean` を再実行**してから Xcode でビルドすること。

---

## 2-4: Swift ウィジェット（WidgetBundle・画像＋言葉ドーン）

**目的**: ホーム画面に「画像＋言葉」をドーンと表示するウィジェットの UI を Swift で実装する。

### やること

1. **WidgetBundle**
   - 1 種類でよい場合は 1 ウィジェット（例: `LifeHackWidget`）を登録。
   - 複数サイズ（小・中・大）をサポートする場合は、同じウィジェットで `supportedFamilies` を指定。
2. **表示内容**
   - App Group の UserDefaults から `widgetPhrase`, `widgetTitle`, `widgetType`, `widgetImagePath`, `widgetUpdatedAt` を読み取る。
   - レイアウト: 画像がある場合は上部に画像（共有コンテナの `widgetImagePath` から読み込み）、その下に文言を大きく表示。画像が無い場合は文言のみ（またはタイプに応じたアイコン＋文言）。
   - デザイン: アプリ内の「ドーン」画面に近い雰囲気（背景グラデーション・文字大きく）を意識。ウィジェットの制約内で可能な範囲で。
3. **Timeline / 更新**
   - 次の更新時刻を「翌日 0 時」（ローカル）に設定するなど、日付が変わったら再表示されるようにする。

### 完了目安

- シミュレータ or 実機でウィジェットを追加し、UserDefaults に書き出した「今日の1枚」の内容（画像＋言葉）が表示される。
- 画像なしアイテムの場合は、文言のみ（またはアイコン＋文言）で表示される。

---

## 2-5: App Group 新規作成・Developer 設定・実機ビルド・更新確認

**目的**: 本番に近い形で App Group を用意し、実機でウィジェットの表示と日付変更時の更新を確認する。

### やること

1. **Apple Developer**
   - App ID を登録（または既存のものを使用）。App Group を有効化。
   - **App Group を新規作成**: 例 `group.com.kenta0015.life-hack-reminder`。メインアプリとウィジェット拡張の両方でこの App Group を有効化。
2. **Signing**
   - メインアプリ・ウィジェット拡張の両方で、該当 App ID と App Group を選択。`app.json` の `expo.ios.appleTeamId` を設定すれば Xcode を開かずに済む場合あり。
3. **実機ビルド**
   - development build を実機にインストール。**Xcode を使わない**場合は「実機確認（Xcode なし）」の方法 A（`npx expo run:ios --device`）または方法 B（EAS Build）を使う。
4. **動作確認**
   - ホーム画面にウィジェットを追加し、「今日の1枚」が画像・文言とも表示されること。
   - アプリでアイテムを追加・編集したあと、ウィジェットが更新されること（必要ならアプリを一度開く）。
   - 日付が変わったあと（翌日）、ウィジェットが「今日の1枚」に切り替わること。

### 完了目安

- 実機でウィジェットの表示・更新が期待どおり動作する。
- Phase 2 のホーム画面ウィジェット（画像ドーン）が完了している。

---

## 実機確認（Xcode なし）

Xcode の GUI を開かずに実機でウィジェットを確認する方法。

### 方法 A: ターミナルから実機ビルド（推奨）

1. **prebuild**（初回 or ネイティブ変更後）  
   `npx expo prebuild --platform ios --clean`
2. **iPhone を USB で接続**し、実機を選択可能にする。
3. **実機にインストール**  
   `npx expo run:ios --device`  
   → 接続中の実機が1台ならそのままビルド・インストール。複数ある場合は端末を選ぶプロンプトが出る。
4. アプリ起動 → ホーム画面で長押し → 「ウィジェットを追加」→「今日の1枚」で表示確認。

**注意**: 初回のみ、署名（Team）の設定が必要な場合がある。そのときは `app.json` の `expo.ios.appleTeamId` に Team ID を設定するか、一度だけ Xcode で Signing を設定すると以降は CLI だけで済む。

**「No profiles for 'com.myapp' were found」が出る場合**

プロビジョニングプロファイルがまだないと、`expo run:ios --device` が失敗する。次のいずれかで対処する。

- **A-1. プロファイル作成を許可してビルド**  
  Expo CLI では xcodebuild に `-allowProvisioningUpdates` を渡しづらいため、**一度だけ** Xcode で開き、メインアプリと「LifeHackWidget」の両方で **Signing & Capabilities → Automatically manage signing** をオンにしてビルド（▶）する。プロファイルが作成されたら、以降は `npx expo run:ios --device` だけでよい。
- **A-2. EAS Build を使う**  
  方法 B のクラウドビルドなら、ローカルにプロファイルは不要（EAS が管理する）。

### 方法 B: EAS Build（クラウドビルド）

1. [EAS](https://docs.expo.dev/build/introduction/) のセットアップ（`eas build:configure`、Apple Developer アカウント連携）。
2. `eas build --platform ios --profile development` でクラウドビルド。
3. 完了後、表示される **QR コードまたはインストール用リンク** から実機にインストール。
4. 同上、ホーム画面にウィジェットを追加して表示確認。

Xcode はマシンにインストールしていなくても、EAS 上でビルドされるため実機確認できる。

---

## 実装時の注意（調査メモより）

- **SDK 54**: @bittingz で prebuild が失敗する場合は、issue 確認のうえパッチ or @bacons + patch に切り替える。
- **App Group**: 本プロジェクト用に新規作成する（他アプリの `group.com.kenta0015.todo-reminder` は使わない）。
- **データ契約**: 上記キー・型を変えずにしておくと、将来公式 `expo-widgets` に差し替えしやすい。

### ビルドエラー「Cannot find 'ExpoAppDelegate' in scope」（expo-file-system）

- **原因**: expo-file-system 18 の `FileSystemModule.swift` が `ExpoAppDelegate.getSubscriberOfType(...)` を呼んでいるが、`getSubscriberOfType` は **ExpoAppDelegate**（expo パッケージの App ターゲット）ではなく **ExpoAppDelegateSubscriberRepository**（expo-modules-core）に定義されている。ExpoFileSystem は Pod としてビルドされるため Expo の Swift は参照できず、ExpoAppDelegate がスコープにない。
- **対処**: `patches/expo-file-system+18.0.12.patch` で `ExpoAppDelegate.getSubscriberOfType` を `ExpoAppDelegateSubscriberRepository.getSubscriberOfType` に置き換え。`postinstall` で patch-package が適用される。
- **適用後**: `npm install`（または `yarn`）でパッチが当たる。その後 `npx expo run:ios --device` または Xcode のどちらでビルドしても同じネイティブビルドが走る。

### Xcode は必須か

- **ネイティブのビルド処理は同じ**: `npx expo run:ios --device` も内部で xcodebuild を実行するだけなので、**ビルドが通る条件は Xcode で Run する場合と同一**。どちらも同じプロジェクト・同じ Pods を使う。
- **Xcode を開かずに済ませるには**: 上記のパッチで Swift エラーを解消し、署名（Team）と Bundle ID を app.json 等で設定しておけば、**ターミナルから `npx expo run:ios --device` だけで実機ビルド可能**。初回だけプロファイル作成のために Xcode で 1 回ビルドした場合は、以降は CLI のみでよい。

### 実機で「No script URL provided」が出る場合

- Debug ビルドでは JS を Metro から取得する想定のため、**Metro が動いていて実機と Mac が同じ Wi‑Fi**である必要がある。詳しくは [調査-実機でNo-script-URL.md](./調査-実機でNo-script-URL.md) の「解決手順」を参照。
- **Metro を起動せずに実機で動かす**場合は、同 doc の「方法 B」のとおり **ios/.xcode.env.updates** を用意する。その場合、JS 変更のたびに再ビルドが必要になる。
- **prebuild 後は ios/ が再生成されるため、.xcode.env.updates は都度作り直す。** 中身の例:
  ```bash
  # Debug でも実機用に JS をバンドルに含め、Metro に繋がず埋め込みのみで起動する
  unset SKIP_BUNDLING
  export SKIP_BUNDLING_METRO_IP=1
  ```

### 「Cannot find native module 'ExpoWidgetBridge'」が出た場合（Life Card 追加時）

- 原因: ローカル Expo モジュール `modules/expo-widget-bridge` に **iOS 用 .podspec がなく**、autolinking の resolve で除外されていた。
- 対応（実施済み）:
  - **modules/expo-widget-bridge/ios/ExpoWidgetBridge.podspec** を追加。
  - **expo-module.config.json** の `ios` に `"podspecPath": "ios/ExpoWidgetBridge.podspec"` を追加。
- これで `npx expo-modules-autolinking resolve --platform ios` に expo-widget-bridge が含まれる。**prebuild をやり直す**（`npx expo prebuild --platform ios --clean`）と、ExpoModulesProvider に WidgetBridgeModule が含まれ、実機で Life Card 追加が動く。

### 「[runtime not ready]: Cannot create devtools websocket connections in embedded environments.」が出た場合

- 原因: Expo 54 の `expo/src/async-require/messageSocket.native.ts` が、  
  - `__DEV__ === true`（開発ビルド）かつ  
  - バンドルが **Metro ではなくアプリに埋め込まれている**（`bundleLoadedFromServer === false`）  
  のときに DevTools 用 WebSocket を張ろうとして、明示的に `throw new Error('Cannot create devtools websocket connections in embedded environments.')` していた。  
  今回は `ios/.xcode.env.updates` で **Debug でも JS を埋め込みバンドルにして Metro なしで起動**していたため、この条件に一致してクラッシュしていた。
- 補足: Xcode コンソールには同時に `127.0.0.1:8081` 宛ての接続が `Connection refused` で繰り返し失敗しており、DevTools WebSocket が存在しない dev サーバーに繋ごうとしていることも確認できた。
- 対応（現状の回避策）:
  - 上記ファイルのロジックを修正し、`!devServer.bundleLoadedFromServer` の場合は **例外を投げずに WebSocket を作らない**ようにした（`null` を返し、その場合は `socket.onmessage` を登録しない）。  
  - これにより「Dev モード × 埋め込みバンドル」でもアプリ本体は起動し、DevTools メッセージソケットだけが無効化される。
  - 現状は `node_modules/expo/src/async-require/messageSocket.native.ts` を直接パッチしている。依存更新に備えて、余裕ができたら patch-package で `patches/expo+54.0.32.patch` を用意する。

---

## チェックリスト（着手時用）

- [x] 2-1: ライブラリ選定・インストール・prebuild 成功（@bacons/apple-targets + patch、実施済み）
- [x] 2-2: 「今日の1枚」ロジック＋ウィジェット用データ形式（lib/widget.ts に実施済み）
- [x] 2-3: ネイティブ書き出しモジュール（UserDefaults ＋ 画像共有コンテナコピー）（実施済み・要 prebuild）
- [x] 2-4: Swift ウィジェット UI（画像＋言葉ドーン）
- [x] 2-5: App Group 新規作成・Developer 設定・実機で表示・更新確認
