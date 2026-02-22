# 調査: 「The `trigger` object you provided is invalid」の原因

## 現象

実機で「テスト通知（10秒後）」ボタンをタップすると、以下のエラーダイアログが表示される。

```
エラー
The `trigger` object you provided is invalid. It needs to contain a `type` or `channelId` entry. Refer to the documentation to update your code: https://docs.expo.dev/versions/latest/sdk/notifications/#notificationtriggerinput
```

---

## 原因（結論）

**渡している `trigger` オブジェクトに `type` または `channelId` が含まれていないため**、expo-notifications が「無効な trigger」と判断して `TypeError` を投げている。

---

## 根拠

### 1. 当プロジェクトで渡している trigger（app/index.tsx）

```ts
trigger: { seconds: 10 },
```

`seconds` だけを渡しており、**`type` も `channelId` も含まれていない**。

### 2. expo-notifications のバリデーション

- **ファイル**: `node_modules/expo-notifications/src/scheduleNotificationAsync.ts`  
  `parseTrigger()` 内で、渡された `trigger` を `hasValidTriggerObject()` に渡している。

- **ファイル**: `node_modules/expo-notifications/src/hasValidTriggerObject.ts`

  ```ts
  export function hasValidTriggerObject(trigger: unknown) {
    return (
      trigger === null ||
      (typeof trigger === 'object' && ('type' in trigger || 'channelId' in trigger))
    );
  }
  ```

  **「object かつ、`type` または `channelId` のどちらかが存在する」** ときだけ `true`。  
  `{ seconds: 10 }` には `type` も `channelId` もないため、ここで `false` になる。

### 3. エラーが投げられる箇所

- **ファイル**: `node_modules/expo-notifications/src/scheduleNotificationAsync.ts` 110–114 行付近

  ```ts
  if (!hasValidTriggerObject(userFacingTrigger)) {
    throw new TypeError(
      `The \`trigger\` object you provided is invalid. It needs to contain a \`type\` or \`channelId\` entry. ...`
    );
  }
  ```

  上記の通り `hasValidTriggerObject({ seconds: 10 })` が `false` のため、この `TypeError` がそのまま画面の「エラー」ダイアログになっている。

### 4. 公式の trigger 型定義（TimeInterval）

- **ファイル**: `node_modules/expo-notifications/src/Notifications.types.ts` 360–371 行付近

  ```ts
  export type TimeIntervalTriggerInput = {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL;  // 必須
    channelId?: string;
    repeats?: boolean;
    seconds: number;
  };
  ```

  「〇秒後」に発火させるトリガーは **`type: SchedulableTriggerInputTypes.TIME_INTERVAL` が必須**。  
  `SchedulableTriggerInputTypes.TIME_INTERVAL` の値は `'timeInterval'`（enum 定義は同ファイル 269 行付近）。

### 5. 旧形式（type なし）が動かない理由

過去のドキュメントやサンプルでは `trigger: { seconds: 10 }` のような省略形が紹介されていたが、**現在の expo-notifications では trigger は必ず「`type` を持つオブジェクト」か「`channelId` を持つオブジェクト」か `null`** である必要がある。  
`type` がないと `hasValidTriggerObject` で弾かれ、その後の `parseTimeIntervalTrigger()` にも渡らず、結果として「無効な trigger」として上記エラーになる。

---

## まとめ

| 項目 | 内容 |
|------|------|
| **直接の原因** | `scheduleNotificationAsync` に渡した `trigger` が `{ seconds: 10 }` のみで、`type` も `channelId` も含まれていないこと。 |
| **仕様** | expo-notifications は trigger オブジェクトに **`type` または `channelId`** の存在を必須としており、`hasValidTriggerObject()` でチェックしている。 |
| **「〇秒後」の正しい形** | `TimeIntervalTriggerInput` に従い、**`type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL`（または `'timeInterval'`）と `seconds`** を指定する必要がある。 |
| **修正方針** | `trigger` を `{ type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 }` の形式に変更する（実装は別タスクで対応）。 |

以上。
