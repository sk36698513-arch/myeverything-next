export const StorageKeys = {
  profile: "@my-everything/profile",
  logs: "@my-everything/logs",
  chat: "@my-everything/chat",
  locale: "@my-everything/locale",
  deviceId: "@my-everything/deviceId",
  mentorQuota: "@my-everything/mentorQuota",
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

// 작업을 재개합니다. 필요한 다른 스토리지 키가 있다면 아래와 같이 추가해주세요.
