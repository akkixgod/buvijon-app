# Dual Search Translation Additions

## Instructions

The i18n system already has the new translation type definitions added. You need to add the translation values for all three languages (English, Russian, Uzbek).

## English Translations (Line ~385-432)

Replace the English messages section (around line 385) with these values:

```typescript
messages: {
  title: 'Messages',
  familyStanding: 'Family Standing',
  perspectiveView: 'View: ',
  allKidsView: 'All Kids',
  all: 'All',
  searchPlaceholder: 'Search chats...',
  createChat: 'Create Chat',
  joinFamily: 'Join Family',
  enterInviteCode: 'Enter invite code',
  join: 'Join',
  searchMembers: 'Searching for members...',
  noMembersFound: 'No members found',
  noFamilyMembers: 'No family members',
  noRanking: 'No ranking data',
  noChats: 'No chats yet',
  startChat: 'Start Chat',
  startChatWith: 'Start chat with ',
  dualSearch: 'Dual Search',
  searchUsers: 'Users',
  searchFamilies: 'Families',
  userPlaceholder: 'Search by @username...',
  familyPlaceholder: 'Search by @family_handle...',
  searchUsersEmpty: 'No parents found',
  searchFamiliesEmpty: 'No families found',
  searching: 'Searching...',
  noResults: 'No results found',
  tryDifferent: 'Try different search terms',
  searchMinChars: 'Type at least 2 characters to search',
  joinFamily: 'Join Family',
  pending: 'Pending',
  accept: 'Accept',
  decline: 'Decline',
  requestSent: 'Request Sent',
  requestSentDesc: 'Your request to join "{familyName}" has been sent. You'll be notified when it's accepted.',
  requestAccepted: 'Request Accepted',
  requestAcceptedDesc: '{requesterName} has been added to your family tree.',
  requestDeclined: 'Request Declined',
  requestDeclinedDesc: '{requesterName}'s request has been declined.',
  requestPending: 'Request Pending',
  requestPendingDesc: 'You have already requested to join this family.',
  noPendingRequests: 'No pending requests',
  noPendingRequestsDesc: 'When someone requests to join your family tree, you'll see their requests here.',
  pendingRequests: 'Join Requests',
  memberCount: '{count} members',
  createdBy: 'Created by {creatorName}',
  mutualFamilies: 'Mutual families',
  chatCreated: 'Chat Created',
  chatCreatedDesc: 'Direct chat has been created successfully.',
  directChat: 'Direct Chat',
  message: 'Message',
  buvijonNotification: '{userName} ({username}) has requested to join your family tree.',
},
```

## Russian Translations (Line ~764-782)

Replace the Russian messages section (around line 764) with these values:

```typescript
messages: {
  title: 'Сообщения',
  familyStanding: 'Семейный рейтинг',
  perspectiveView: 'Вид: ',
  allKidsView: 'Все дети',
  all: 'Все',
  searchPlaceholder: 'Поиск чатов...',
  createChat: 'Создать чат',
  joinFamily: 'Присоединиться к семье',
  enterInviteCode: 'Введите код приглашения',
  join: 'Присоединиться',
  searchMembers: 'Поиск участников...',
  noMembersFound: 'Участники не найдены',
  noFamilyMembers: 'Нет участников семьи',
  noRanking: 'Нет данных рейтинга',
  noChats: 'Чатов пока нет',
  startChat: 'Начать чат',
  startChatWith: 'Начать чат с ',
  dualSearch: 'Двойной поиск',
  searchUsers: 'Пользователи',
  searchFamilies: 'Семьи',
  userPlaceholder: 'Поиск по @username...',
  familyPlaceholder: 'Поиск по @family_handle...',
  searchUsersEmpty: 'Родителей не найдено',
  searchFamiliesEmpty: 'Семей не найдено',
  searching: 'Поиск...',
  noResults: 'Ничего не найдено',
  tryDifferent: 'Попробуйте другие поисковые запросы',
  searchMinChars: 'Введите не менее 2 символов для поиска',
  joinFamily: 'Присоединиться к семье',
  pending: 'Ожидание',
  accept: 'Принять',
  decline: 'Отклонить',
  requestSent: 'Запрос отправлен',
  requestSentDesc: 'Ваш запрос на присоединение к "{familyName}" отправлен. Вы получите уведомление, когда он будет принят.',
  requestAccepted: 'Запрос принят',
  requestAcceptedDesc: '{requesterName} добавлен в вашу семейное дерево.',
  requestDeclined: 'Запрос отклонён',
  requestDeclinedDesc: 'Запрос {requesterName} отклонён.',
  requestPending: 'Запрос ожидает',
  requestPendingDesc: 'Вы уже отправили запрос на присоединение к этой семье.',
  noPendingRequests: 'Нет ожидающих запросов',
  noPendingRequestsDesc: 'Когда кто-то запросит присоединение к вашему семейному дереву, вы увидите их запросы здесь.',
  pendingRequests: 'Запросы на присоединение',
  memberCount: '{count} участников',
  createdBy: 'Создано {creatorName}',
  mutualFamilies: 'Общие семьи',
  chatCreated: 'Чат создан',
  chatCreatedDesc: 'Прямой чат успешно создан.',
  directChat: 'Прямой чат',
  message: 'Сообщение',
  buvijonNotification: '{userName} ({username}) запросил(а) присоединиться к вашему семейному дереву.',
},
```

## Uzbek (Latin) Translations (Line ~1113-1131)

Replace the Uzbek messages section (around line 1113) with these values:

```typescript
messages: {
  title: 'Xabarlar',
  familyStanding: "Oila reytingi",
  perspectiveView: "Ko'rinish: ",
  allKidsView: "Barcha bolalar",
  all: 'Barchasi',
  searchPlaceholder: 'Chatlarni qidirish...',
  createChat: 'Chat yaratish',
  joinFamily: "Oilaga qo'shilish",
  enterInviteCode: "Taklif kodini kiriting",
  join: "Qo'shilish",
  searchMembers: "Ishtirokchilarni qidirish...",
  noMembersFound: "Ishtirokchilar topilmadi",
  noFamilyMembers: "Oila a'zolari yo'q",
  noRanking: "Reyting ma'lumotlari yo'q",
  noChats: "Chatlar yo'q",
  startChat: "Chatni boshlash",
  startChatWith: " bilan chatni boshlash",
  dualSearch: "Ikki qidirish",
  searchUsers: "Foydalanuvchilar",
  searchFamilies: "Oilar",
  userPlaceholder: "@username bo'yicha qidirish...",
  familyPlaceholder: "@family_handle bo'yicha qidirish...",
  searchUsersEmpty: "Ota-onalar topilmadi",
  searchFamiliesEmpty: "Oilar topilmadi",
  searching: "Qidirilmoqda...",
  noResults: "Hech narsa topilmadi",
  tryDifferent: "Boshqa qidirish so'zlarini sinab ko'ring",
  searchMinChars: "Qidirish uchun kamida 2 ta belgi kiritish",
  joinFamily: "Oilaga qo'shilish",
  pending: "Kutilmoqda",
  accept: "Qabul qilish",
  decline: "Rad etish",
  requestSent: "So'rov yuborildi",
  requestSentDesc: '"{familyName}" oilasiga qo\'shilish so\'rovi yuborildi. Qabul qilinganda sizga xabar beriladi.',
  requestAccepted: "So'rov qabul qilindi",
  requestAcceptedDesc: '{requesterName} oilangiziga qo\'shildi.',
  requestDeclined: "So'rov rad etildi",
  requestDeclinedDesc: '{requesterName} so\'rovi rad etildi.',
  requestPending: "So'rov kutilmoqda",
  requestPendingDesc: 'Siz allaqachon bu oilaga qo\'shish so\'rov yuborgansiz.',
  noPendingRequests: "Kutilayotgan so\'rovlar yo'q",
  noPendingRequestsDesc: "Kimdir sizning oilangizingizga qo\'shmoqchi bo\'lsa, siz ularning so\'rovlarini shu yerni ko\'rasiz.",
  pendingRequests: "Qo\'shish so\'rovi",
  memberCount: '{count} a\'zo',
  createdBy: '{creatorName} tomonidan yaratildi',
  mutualFamilies: 'Umumiy oilar',
  chatCreated: 'Chat yaratildi',
  chatCreatedDesc: "To\'g\'rida chat muvoffaqiyat yaratildi.",
  directChat: "To\'g\'rida chat",
  message: 'Xabar',
  buvijonNotification: '{userName} ({username}) sizning oilangizingiziga qo\'shmoqchi.',
},
```

## Note

The translations use placeholders like `{familyName}`, `{requesterName}`, `{username}`, `{count}` that should be replaced dynamically in the code using the translation function parameters.

Example usage:
```typescript
t('messages.requestSentDesc', { familyName: "Johnson Family" })
// Result: "Your request to join "Johnson Family" has been sent..."
```
