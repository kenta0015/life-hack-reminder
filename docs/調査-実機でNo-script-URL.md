# 調査: 実機で「No script URL provided」になる原因

## 現象

- 実機にアプリをインストール後、起動すると赤いエラーが表示される。
- 文言: **"No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle."** および **"unsanitizedScriptURLString = (null)"**。
- ターミナルでは `Waiting on http://localhost:8081` のあと `Installing ... ✔ Complete 100%` となり、インストール自体は成功している。

---

## 結論（原因の要約）

**アプリが参照する「JS を読みにいく URL」がどれも決まらず、結果として `null` になっている。**

- **想定されている 2 通り**  
  1. **Metro の URL**（開発時） … 実機から Mac 上の Metro (例: `http://<MacのIP>:8081`) にアクセスして JS を取得する  
  2. **埋め込みバンドル**（本番相当） … アプリ内の `main.jsbundle` を読み込む  

- **今回の実機 Debug ビルドでは**  
  - 1 も 2 も「使える状態」になっていないため、スクリプト URL が `null` になり、上記エラーになっている。

---

## 原因の流れ（コードベースに沿った説明）

### 1. アプリはどこで「スクリプト URL」を決めているか

- **入口**: `ios/LifeHackReminder/AppDelegate.swift` の `ReactNativeDelegate.bundleURL()`。
- **中身**:  
  - **DEBUG**: `RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")` に依存。  
  - **RELEASE**: `Bundle.main.url(forResource: "main", withExtension: "jsbundle")`（アプリ内の `main.jsbundle`）。

実機で Debug ビルドなので、ここでは **RCTBundleURLProvider** の結果が使われる。

---

### 2. RCTBundleURLProvider が URL を決める仕組み（React Native 側）

（参照: `node_modules/react-native/React/Base/RCTBundleURLProvider.mm`）

1. **packagerServerHostPort** を決める  
   - まず **jsLocation**（UserDefaults の `RCT_jsLocation`）を見る。  
   - `RCT_DEV_MENU` が有効なときは、そのホストで **isPackagerRunning**（`<host>:8081/status` にアクセス）を実行する。  
     - **失敗すると**（Metro に届かない・動いていない）、ここで `location = nil` にする。  
   - まだ nil なら **guessPackagerHost** を試す。  
     - アプリバンドル内の **ip.txt**（Mac の IP がビルド時に書き込まれる）を読む。  
     - その IP で再度 **isPackagerRunning** を実行。  
       - ここも **失敗すると**（実機から Mac:8081 に届かない）、`guessPackagerHost` は nil。  
   - 結果、**packagerServerHostPort が nil** になる。

2. **jsBundleURLForBundleRoot** の挙動  
   - `packagerServerHostPort` が **nil** のときは、**フォールバック**として  
     `[[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"]` を返す。  
   - つまり「Metro の URL が使えないときは、アプリ内の main.jsbundle を使う」設計。

3. **今回の Debug ビルドでは**  
   - 上記のため **packagerServerHostPort = nil**（後述の理由で Metro が「使える」と判定されない）。  
   - フォールバックの **main.jsbundle** も、Debug では **バンドルされずに存在しない**（下記）。  
   - その結果、**返す URL がなく `null`** → 「No script URL provided」「unsanitizedScriptURLString = (null)」になる。

---

### 3. なぜ「Metro の URL」が使えないか（packagerServerHostPort が nil）

- **実機**では「localhost」は端末自身を指すため、**localhost:8081** では Mac 上の Metro に届かない。
- そのため、React Native はビルド時に **Mac の IP を ip.txt に書き、実機ではその IP:8081 にアクセスする**仕組みになっている（`node_modules/expo/scripts/react-native-xcode.sh` の 16–27 行付近）。
- **isPackagerRunning** は、そのホスト（または jsLocation）に対して **同期的に** `http(s)://<host>:8081/status` を叩き、「packager-status:running」が返るかを見ている。
- 次のいずれかだと、**isPackagerRunning が false** になり、packagerServerHostPort が nil になる。
  - **Metro が Mac で動いていない**（`npx expo start` などで 8081 が listen していない）。
  - **実機と Mac が別ネットワーク**（例: 実機は cellular、Mac は別 Wi‑Fi）。
  - **ファイアウォール**で Mac の 8081 がブロックされている。
  - **ip.txt がアプリに含まれていない**（ビルドスクリプトの条件で書き込まれなかった等）。

「Waiting on http://localhost:8081」は **Mac 側で 8081 を待っている**状態を示すが、**実機から見た「Metro に届くか」は別問題**なので、実機起動時に isPackagerRunning が失敗している、という整理になる。

---

### 4. なぜ「埋め込み main.jsbundle」もないか

- **Xcode のビルドフェーズ**「Bundle React Native code and images」では、**Debug のとき `SKIP_BUNDLING=1` が設定されている**（`ios/LifeHackReminder.xcodeproj/project.pbxproj` 内の該当 shellScript）。
- そのため、**Debug ビルドでは JS のバンドル（main.jsbundle の生成・埋め込み）がスキップ**される。
- 設計上は「Debug では常に Metro から読む」前提なので、**main.jsbundle はアプリに含まれない**。
- 結果、RCTBundleURLProvider のフォールバック `URLForResource:@"main" withExtension:@"jsbundle"` は **nil** になる。

---

## まとめ（原因一覧）

| 項目 | 内容 |
|------|------|
| **直接の原因** | スクリプト URL が **null**。Metro 用 URL も、埋め込み main.jsbundle も「使える形」で存在しない。 |
| **Metro URL が使えない理由** | 実機から Mac:8081 にアクセスできていない（Metro 未起動 / 別ネット / ファイアウォール / ip.txt 未生成など）。そのため `packagerServerHostPort` が nil。 |
| **埋め込みバンドルがない理由** | Debug で **SKIP_BUNDLING=1** のため、main.jsbundle がビルドに含まれない。 |
| **エラーメッセージの意味** | 「packager が動いていることを前提にするか、アプリバンドルに JS を埋め込んでおくか、どちらかが必要」というメッセージの通り、**そのどちらも満たしていない状態**。 |

---

## 解決手順

### 方法 A: Metro を先に起動してからアプリを起動する（推奨・通常の開発）

実機はビルド時に書き込まれた **ip.txt**（Mac の IP）で Metro に繋ぎに行く。**Metro が動いていて、実機と Mac が同じ Wi‑Fi にいる**必要がある。

1. **ターミナル 1**で Metro を起動する。  
   ```bash
   cd /Users/ken/app_development/Reminder-Life-Hack
   npx expo start
   ```
   - 起動したら **このターミナルは閉じない**（Metro を止めない）。
2. **実機と Mac を同じ Wi‑Fi に接続**する。
3. **ターミナル 2**で実機にビルド・インストールする。  
   ```bash
   npx expo run:ios --device
   ```
   - または Xcode で ▶ Run。
4. 実機でアプリを起動する。  
   - ビルド時に ip.txt に Mac の IP が入っているので、実機が `http://<MacのIP>:8081` にアクセスし、Metro から JS を取得する。

**まだ「No script URL provided」になる場合**

- Mac のファイアウォールで **ポート 8081** が許可されているか確認する（「システム設定 → ネットワーク → ファイアウォール」など）。
- 実機でアプリの **「ローカルネットワーク」** 許可をオンにする（設定 → プライバシーとセキュリティ → ローカルネットワーク → 当該アプリ）。

---

### 方法 B: Metro なしで実機で動かす（JS をアプリに埋め込む）

Metro を起動せず、**Debug でも JS バンドルをアプリに埋め込む**設定にする。ウィジェット確認だけしたいときなどに使える。代わりに **JS を変えるたびにネイティブの再ビルドが必要**になる。

1. **ios/.xcode.env.updates** を作成し、以下を書く。  
   ```bash
   # Debug でも実機用に JS をバンドルに含め、Metro に繋がず埋め込みのみで起動する
   unset SKIP_BUNDLING
   export SKIP_BUNDLING_METRO_IP=1
   ```
   - `unset SKIP_BUNDLING`: バンドル処理を実行する（`0` だとスクリプトがスキップすると誤判定するため unset）。
   - `SKIP_BUNDLING_METRO_IP=1`: ip.txt を書かない。アプリが Metro の URL を参照せず、埋め込みの main.jsbundle を使う。
2. クリーンしてから実機でビルドする。  
   ```bash
   npx expo run:ios --device
   ```
   - または Xcode で Product → Clean Build Folder のあと ▶ Run。
3. アプリ起動時は Metro 不要。アプリ内の main.jsbundle が使われる。

**元に戻すとき**  
- Metro で開発したい場合は、**ios/.xcode.env.updates** を削除するか、中身を空にする（または `export SKIP_BUNDLING=1`）。  
- `.xcode.env.updates` は git に含めず、必要なら `.gitignore` に `ios/.xcode.env.updates` を追加してよい。
