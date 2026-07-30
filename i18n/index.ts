import { useSettingsStore } from '@/store/settingsStore';

export type Lang = 'ru' | 'uz-cyrillic' | 'uz-latin';

export interface T {
  tagline: string;

  login: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    noAccount: string;
    registerLink: string;
    orDivider: string;
    google: string;
    googleConfigError: string;
    googleError: string;
    errEmpty: string;
    errInvalid: string;
    errSend: string;
    errNotFound: string;
  };

  register: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    emailLabel: string;
    submit: string;
    hasAccount: string;
    loginLink: string;
    back: string;
    errName: string;
    errEmail: string;
    errInvalidEmail: string;
    errSend: string;
    errExists: string;
    errUsername: string;
    errUsernameTaken: string;
    errUsernameFormat: string;
  };

  otp: {
    titleConfirm: string;
    titleLogin: string;
    subtitle: string;
    spamHint: string;
    back: string;
    checking: string;
    confirm: string;
    resendIn: string;
    resendBtn: string;
    errIncomplete: string;
    errWrong: string;
    errNotFound: string;
    seconds: string;
  };

  tabs: {
    garden: string;
    children: string;
    reports: string;
    settings: string;
    create: string;
    ai: string;
    search: string;
  };

  garden: {
    subtitle: string;
    searchPlaceholder: string;
    you: string;
    findMore: string;
    noResults: string;
    emptyTitle: string;
    emptyBody: string;
    addBtn: string;
    ageLabel: (n: number) => string;
  };

  children: {
    title: string;
    empty: string;
    ageLabel: (n: number) => string;
  };

  reports: {
    title: string;
    today: string;
    screenTime: string;
    limit: string;
    percent: string;
    weekTitle: string;
    avgTitle: string;
    dailyAvg: string;
    overLimitDays: string;
    dayUnit: string;
    noChild: string;
    hourSuffix: string;
  };

  settings: {
    title: string;
    sectionNotif: string;
    notifications: string;
    sound: string;
    sectionLang: string;
    sectionAbout: string;
    version: string;
    privacy: string;
    terms: string;
    logout: string;
    logoutAlertTitle: string;
    logoutAlertMsg: string;
    logoutCancel: string;
    logoutConfirm: string;
    usernameLabel: string;
    editAvatarHint: string;
  };

  search: {
    headerTitle: string;
    placeholder: string;
    emptyTitle: string;
    emptyBody: string;
    noResults: string;
    loading: string;
  };

  profile: {
    uploadAvatar: string;
    uploadError: string;
  };

  childDetail: {
    notFound: string;
    back: string;
    ageLabel: (n: number) => string;
    today: string;
    used: string;
    over: string;
    remaining: string;
    limit: string;
    week: string;
    settingsSection: string;
    changeLimit: string;
    blockApps: string;
    editProfile: string;
    editTitle: string;
    editSave: string;
    editAppsLabel: string;
    editErrName: string;
    editErrPin: string;
    appsSection: string;
    launches: string;
    noApps: string;
    grantPermission: string;
    permissionHint: string;
    devAddTime: string;
    deleteTitle: (name: string) => string;
    deleteMsg: string;
    deleteCancel: string;
    deleteConfirm: string;
    hourSuffix: string;
  };

  addChild: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    ageLabel: string;
    agePlaceholder: string;
    flowerType: string;
    flowerColor: string;
    pinLabel: string;
    pinPlaceholder: string;
    pinHint: string;
    limitLabel: string;
    addBtn: string;
    errName: string;
    errAge: string;
    errPin: string;
    errSave: string;
  };

  flowerStates: {
    blooming: string;
    warning: string;
    wilting: string;
  };

  duration: {
    min: string;
    hour: string;
  };

  dayNames: string[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]

  onboarding: {
    skip: string;
    next: string;
    done: string;
    steps: Array<{ title: string; body: string }>;
  };

  messages: {
    title: string;
    familyStanding: string;
    perspectiveView: string;
    allKidsView: string;
    all: string;
    searchPlaceholder: string;
    createChat: string;
    joinFamily: string;
    enterInviteCode: string;
    join: string;
    searchMembers: string;
    noMembersFound: string;
    noFamilyMembers: string;
    noRanking: string;
    noChats: string;
    startChat: string;
    startChatWith: string;
    dualSearch: string;
    searchUsers: string;
    searchFamilies: string;
    userPlaceholder: string;
    familyPlaceholder: string;
    searchUsersEmpty: string;
    searchFamiliesEmpty: string;
    searching: string;
    noResults: string;
    tryDifferent: string;
    searchMinChars: string;
    joinFamily: string;
    pending: string;
    accept: string;
    decline: string;
    requestSent: string;
    requestSentDesc: string;
    requestAccepted: string;
    requestDeclined: string;
    requestPending: string;
    noPendingRequests: string;
    noPendingRequestsDesc: string;
    pendingRequests: string;
    memberCount: string;
    createdBy: string;
    mutualFamilies: string;
    chatCreated: string;
    directChat: string;
    message: string;
    buvijonNotification: string;
  };

  common: {
    loading: string;
    retry: string;
    tryAgain: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    confirm: string;
  };

  posts: {
    title: string;
    empty: string;
    like: string;
    comment: string;
    comments: string;
    addComment: string;
    commentPlaceholder: string;
    send: string;
    editPost: string;
    deletePost: string;
    archivePost: string;
    deleteConfirm: string;
    deleteCancel: string;
    deleteMsg: string;
    editTitle: string;
    editSave: string;
    editCancel: string;
    you: string;
    justNow: string;
    firstPostCta: string;
    firstPostBtn: string;
    showMore: string;
  };

  analysis: {
    title: string;
    todayBtn: string;
    weekBtn: string;
    familyAvg: string;
    topApp: string;
    mostImproved: string;
    childrenLabel: string;
    stateSafe: string;
    stateModerate: string;
    stateOverLimit: string;
    stateDoctorMode: string;
    doctorDay: (n: number) => string;
    contactDoctor: string;
    usageLevels: string;
    levelSafe: string;
    levelFair: string;
    levelModerate: string;
    levelRisky: string;
    levelDoctor: string;
    explore: string;
    improvement: string;
    improvementSub: string;
    mentalCase: string;
    mentalCaseSub: string;
    fullDayNames: string[];
    monthNames: string[];
    weeklyInsight: string;
    generating: string;
    refresh: string;
    retry: string;
    trends: { improving: string; worsening: string; stable: string };
  };

  ai: {
    headerTitle: string;
    headerSub: string;
    welcome: string;
    suggestionsLabel: string;
    suggestions: string[];
    placeholder: string;
    demoResponse: string;
  };

  create: {
    headerTitle: string;
    cancel: string;
    publish: string;
    typeLabel: string;
    typeProgress: string;
    typeMilestone: string;
    typeTip: string;
    typeNote: string;
    contentLabel: string;
    placeholder: string;
    tip: string;
    addPhoto: string;
    errFailed: string;
  };

  blockedApps: {
    title: string;
    save: string;
    info: string;
    searchPlaceholder: string;
    selectedCount: (n: number) => string;
    overlayTitle: string;
    overlayMsg: string;
    overlayGrant: string;
    categories: {
      social: string;
      game: string;
      video: string;
      education: string;
      messenger: string;
      browser: string;
      utility: string;
      other: string;
    };
    riskLevels: {
      low: string;
      medium: string;
      high: string;
    };
  };

  parentPin: {
    title: string;
    subtitle: string;
    pinLabel: string;
    pinPlaceholder: string;
    biometricLabel: string;
    biometricPrompt: string;
    unlockBtn: string;
    cancelBtn: string;
    wrongPin: string;
    settingsTitle: string;
    biometricToggle: string;
    biometricEnabled: string;
    biometricDisabled: string;
    pinRemoved: string;
    setupTitle: string;
    setupSubtitle: string;
    setupPinLabel: string;
    setupPinPlaceholder: string;
    setupConfirmLabel: string;
    setupBtn: string;
    errPinMismatch: string;
    errPinLength: string;
    /** Full-screen lock header */
    lockTitle: string;
    lockSubtitle: string;
    /** Hint under numpad */
    lockHint: string;
  };

  messages: {
    title: string;
    familyStanding: string;
    perspectiveView: string;
    allKidsView: string;
    all: string;
    searchPlaceholder: string;
    createChat: string;
    joinFamily: string;
    enterInviteCode: string;
    join: string;
    searchMembers: string;
    noMembersFound: string;
    noFamilyMembers: string;
    noRanking: string;
    noChats: string;
    startChat: string;
    startChatWith: string;
    dualSearch: string;
    searchUsers: string;
    searchFamilies: string;
    userPlaceholder: string;
    familyPlaceholder: string;
    searchUsersEmpty: string;
    searchFamiliesEmpty: string;
    searching: string;
    noResults: string;
    tryDifferent: string;
    searchMinChars: string;
    joinFamily: string;
    pending: string;
    accept: string;
    decline: string;
    requestSent: string;
    requestSentDesc: string;
    requestAccepted: string;
    requestDeclined: string;
    requestPending: string;
    noPendingRequests: string;
    noPendingRequestsDesc: string;
    pendingRequests: string;
    memberCount: string;
    createdBy: string;
    mutualFamilies: string;
    chatCreated: string;
    directChat: string;
    message: string;
    buvijonNotification: string;
  };

  common: {
    loading: string;
    retry: string;
    tryAgain: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    confirm: string;
  };
}

const ru: T = {
  tagline: 'Сад ваших детей',
  login: {
    title: 'Войти',
    subtitle: 'Введите email — мы отправим код подтверждения',
    emailLabel: 'Email адрес',
    emailPlaceholder: 'example@mail.com',
    submit: 'Получить код',
    noAccount: 'Нет аккаунта?',
    registerLink: 'Зарегистрироваться',
    orDivider: 'или',
    google: 'Войти через Google',
    googleConfigError: 'Google не настроен. Используйте вход через email.',
    googleError: 'Ошибка Google. Попробуйте снова.',
    errEmpty: 'Введите email адрес',
    errInvalid: 'Введите корректный email',
    errSend: 'Ошибка отправки кода',
    errNotFound: 'Аккаунт не найден. Сначала зарегистрируйтесь',
  },
  register: {
    title: 'Создать аккаунт',
    subtitle: 'Станьте садовником для ваших детей 🌱',
    nameLabel: 'Ваше имя',
    namePlaceholder: 'Например: Камола',
    emailLabel: 'Email адрес',
    submit: 'Продолжить',
    hasAccount: 'Уже есть аккаунт?',
    loginLink: 'Войти',
    back: 'Назад',
    errName: 'Введите ваше имя',
    errEmail: 'Введите email адрес',
    errInvalidEmail: 'Введите корректный email',
    errSend: 'Ошибка отправки кода',
    errExists: 'Аккаунт с таким email уже существует. Войдите',
    errUsername: 'Введите имя пользователя',
    errUsernameTaken: 'Это имя уже занято',
    errUsernameFormat: '3–20 символов: буквы, цифры, подчёркивание',
    usernameLabel: 'Имя пользователя',
    usernamePlaceholder: 'например: kamola_95',
  },
  otp: {
    titleConfirm: 'Подтверждение email',
    titleLogin: 'Код из письма',
    subtitle: 'Мы отправили 8-значный код на',
    spamHint: 'Проверьте папку «Спам», если письмо не пришло',
    back: 'Назад',
    checking: 'Проверка...',
    confirm: 'Подтвердить',
    resendIn: 'Отправить снова через',
    resendBtn: '↺  Отправить код снова',
    errIncomplete: 'Введите полный код',
    errWrong: 'Неверный код, попробуйте снова',
    errNotFound: 'Email не зарегистрирован. Пройдите регистрацию.',
    seconds: 'с',
  },
  tabs: {
    garden: 'Главная',
    children: 'Семья',
    reports: 'Анализ',
    settings: 'Настройки',
    create: 'Пост',
    ai: 'ИИ',
    search: 'Поиск',
  },
  garden: {
    subtitle: 'Мой сад 🌿',
    searchPlaceholder: 'Поиск семей...',
    you: 'Вы',
    findMore: 'Найти',
    noResults: 'Ничего не найдено',
    emptyTitle: 'Сад пуст',
    emptyBody: 'Добавьте первого ребёнка\nи посадите их цветок',
    addBtn: 'Добавить ребёнка',
    ageLabel: (n) => `${n} лет`,
  },
  children: {
    title: 'Дети',
    empty: 'Детей нет. Добавьте!',
    ageLabel: (n) => `${n} лет`,
  },
  reports: {
    title: 'Отчёты',
    today: 'Сегодня',
    screenTime: 'Экранное время',
    limit: 'Лимит',
    percent: 'Процент',
    weekTitle: 'За неделю',
    avgTitle: 'Средняя статистика',
    dailyAvg: 'Среднее за день',
    overLimitDays: 'Дней сверх лимита',
    dayUnit: 'дн.',
    noChild: 'Ребёнок не выбран',
    hourSuffix: 'ч',
  },
  settings: {
    title: 'Настройки',
    sectionNotif: 'Уведомления',
    notifications: 'Уведомления',
    sound: 'Звук',
    sectionLang: 'Язык приложения',
    sectionAbout: 'О приложении',
    version: 'Buvijon v1.0.1',
    privacy: 'Политика конфиденциальности',
    terms: 'Условия использования',
    logout: 'Выйти',
    logoutAlertTitle: 'Выход',
    logoutAlertMsg: 'Хотите выйти из аккаунта?',
    logoutCancel: 'Отмена',
    logoutConfirm: 'Выйти',
    usernameLabel: 'Имя пользователя',
    editAvatarHint: 'Нажмите для смены фото',
  },
  childDetail: {
    notFound: 'Ребёнок не найден',
    back: 'Назад',
    ageLabel: (n) => `${n} лет`,
    today: 'Сегодня',
    used: 'Использовано',
    over: 'Превышено',
    remaining: 'Осталось',
    limit: 'Лимит',
    week: 'Неделя',
    settingsSection: 'Настройки',
    changeLimit: 'Изменить лимит',
    blockApps: 'Блокировать приложения',
    editProfile: 'Редактировать профиль',
    editTitle: 'Профиль ребёнка',
    editSave: 'Сохранить',
    editAppsLabel: 'Отслеживаемые приложения',
    editErrName: 'Введите имя',
    editErrPin: 'Введите 4-значный PIN',
    appsSection: 'Приложения',
    launches: 'запусков',
    noApps: 'Нет данных',
    grantPermission: 'Разрешить доступ',
    permissionHint: 'Для отслеживания экранного времени нужно разрешить доступ к статистике использования',
    devAddTime: '[DEV] +15 мин',
    deleteTitle: (name) => `Удалить ${name}?`,
    deleteMsg: 'Все данные будут удалены. Продолжить?',
    deleteCancel: 'Отмена',
    deleteConfirm: 'Удалить',
    hourSuffix: 'ч',
  },
  addChild: {
    title: 'Новый ребёнок',
    subtitle: 'Добавьте ребёнка и посадите его цветок',
    nameLabel: 'Имя ребёнка',
    namePlaceholder: 'Например: Алинур',
    ageLabel: 'Возраст',
    agePlaceholder: 'Лет',
    flowerType: 'Тип цветка',
    flowerColor: 'Цвет цветка',
    pinLabel: 'PIN-код ребёнка',
    pinPlaceholder: '4 цифры',
    pinHint: 'PIN нужен чтобы определить какой ребёнок пользуется телефоном',
    limitLabel: 'Дневной лимит экранного времени',
    addBtn: 'Добавить ребёнка',
    errName: 'Введите имя ребёнка',
    errAge: 'Введите возраст',
    errPin: 'Введите 4-значный PIN-код',
    errSave: 'Ошибка сохранения',
  },
  flowerStates: {
    blooming: 'Цветёт',
    warning: 'Осторожно',
    wilting: 'Вянет',
  },
  duration: { min: 'мин', hour: 'ч' },
  dayNames: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  posts: {
    title: 'Посты',
    empty: 'Постов пока нет',
    like: 'Нравится',
    comment: 'Комментарий',
    comments: 'Комментарии',
    addComment: 'Добавить комментарий',
    commentPlaceholder: 'Напишите комментарий...',
    send: 'Отправить',
    editPost: 'Редактировать',
    deletePost: 'Удалить',
    archivePost: 'Архивировать',
    deleteConfirm: 'Удалить',
    deleteCancel: 'Отмена',
    deleteMsg: 'Этот пост будет удалён навсегда',
    editTitle: 'Редактировать пост',
    editSave: 'Сохранить',
    editCancel: 'Отмена',
    you: 'Вы',
    justNow: 'Только что',
    firstPostCta: 'Напишите первый пост о вашем малыше!',
    firstPostBtn: 'Написать пост',
    showMore: 'Показать ещё',
  },
  analysis: {
    title: 'Анализ',
    todayBtn: 'Сегодня',
    weekBtn: 'Неделя',
    familyAvg: 'сред. семьи',
    topApp: 'топ-приложение',
    mostImproved: 'улучшился',
    childrenLabel: 'дети',
    stateSafe: 'Норма',
    stateModerate: 'Умеренно',
    stateOverLimit: 'Перебор',
    stateDoctorMode: 'Режим врача',
    doctorDay: (n) => `${n}-й день`,
    contactDoctor: 'Позвонить врачу',
    usageLevels: 'уровни использования сегодня',
    levelSafe: 'Норма',
    levelFair: 'Хорошо',
    levelModerate: 'Умеренно',
    levelRisky: 'Риск',
    levelDoctor: 'Врач',
    explore: 'исследовать',
    improvement: 'Улучшение',
    improvementSub: 'Тренды сокращения экранного времени',
    mentalCase: 'Ментальное здоровье',
    mentalCaseSub: 'Качество использования и оценка благополучия',
    fullDayNames: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    monthNames: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    weeklyInsight: 'недельный анализ',
    generating: 'анализ генерируется...',
    refresh: 'Обновить',
    retry: 'Повторить',
    trends: { improving: 'улучшение', worsening: 'ухудшение', stable: 'стабильно' },
  },
  ai: {
    headerTitle: 'Buvijon AI',
    headerSub: 'Советы по экранному времени',
    welcome: 'Привет! Я AI-ассистент Buvijon. Задайте мне вопрос о здоровье экранного времени, возрастных нормах или о том, как помочь вашим детям.',
    suggestionsLabel: 'Популярные вопросы',
    suggestions: [
      'Сколько часов экрана нормально для 6-летнего ребёнка?',
      'Как объяснить ребёнку, почему ограничивают экранное время?',
      'Какие признаки зависимости от гаджетов?',
      'Как заменить гаджеты полезным занятием?',
    ],
    placeholder: 'Задайте вопрос...',
    demoResponse: 'Это демо-ответ. Подключите API для получения реальных рекомендаций.',
  },
  create: {
    headerTitle: 'Новый пост',
    cancel: 'Отмена',
    publish: 'Опубликовать',
    typeLabel: 'Тип записи',
    typeProgress: 'Прогресс',
    typeMilestone: 'Достижение',
    typeTip: 'Совет',
    typeNote: 'Заметка',
    contentLabel: 'Содержание',
    placeholder: 'Поделитесь наблюдением или достижением вашего ребёнка...',
    tip: 'Ваш пост увидят все пользователи Buvijon. Делитесь опытом и советами!',
    addPhoto: 'Добавить фото',
    errFailed: 'Не удалось опубликовать пост. Попробуйте снова',
  },
  blockedApps: {
    title: 'Блокировка приложений',
    save: 'Сохранить',
    info: 'Выберите приложения, которые будут заблокированы при достижении дневного лимита экранного времени.',
    searchPlaceholder: 'Поиск приложений...',
    selectedCount: (n: number) => `${n} заблокировано`,
    overlayTitle: 'Нужно разрешение',
    overlayMsg: 'Для блокировки приложений нужно разрешение на отображение поверх других приложений.',
    overlayGrant: 'Открыть настройки',
    categories: {
      social: 'Соцсеть',
      game: 'Игра',
      video: 'Видео',
      education: 'Учёба',
      messenger: 'Мессенджер',
      browser: 'Браузер',
      utility: 'Утилита',
      other: 'Другое',
    },
    riskLevels: {
      low: 'низкий риск',
      medium: 'средний риск',
      high: 'высокий риск',
    },
  },
  parentPin: {
    title: 'Защита родительского доступа',
    subtitle: 'Настройте PIN или биометрию для защиты настроек детей',
    pinLabel: 'PIN-код',
    pinPlaceholder: '4 цифры',
    biometricLabel: 'Биометрия',
    biometricPrompt: 'Подтвердите, что вы родитель',
    unlockBtn: 'Разблокировать',
    cancelBtn: 'Отмена',
    wrongPin: 'Неверный PIN-код',
    settingsTitle: 'Настройки доступа',
    biometricToggle: 'Вход по биометрии',
    biometricEnabled: 'Включено',
    biometricDisabled: 'Выключено',
    pinRemoved: 'PIN-код удалён',
    setupTitle: 'Создать PIN-код',
    setupSubtitle: 'Установите 4-значный PIN-код для защиты настроек',
    setupPinLabel: 'PIN-код',
    setupPinPlaceholder: '••••',
    setupConfirmLabel: 'Подтвердить PIN',
    setupBtn: 'Создать',
    errPinMismatch: 'PIN-коды не совпадают',
    errPinLength: 'Введите 4 цифры',
    lockTitle: 'Подтвердите вход',
    lockSubtitle: 'Войдите с родительским PIN или через биометрию',
    lockHint: 'PIN родителя — полный доступ | PIN ребёнка — ограниченный режим',
  },
  onboarding: {
    skip: 'Пропустить',
    next: 'Следующее',
    done: 'Начать!',
    steps: [
      {
        title: 'Добро пожаловать в Buvijon! 🌱',
        body: 'Следите за экранным временем детей и наблюдайте, как расцветают их цветы',
      },
      {
        title: 'Добавьте ребёнка',
        body: 'Нажмите + чтобы добавить первого ребёнка и посадить его цветок в саду',
      },
      {
        title: 'Цветок — индикатор',
        body: '🟢 Цветёт — всё хорошо\n🟡 Осторожно — скоро лимит\n🔴 Вянет — лимит превышен',
      },
      {
        title: 'Навигация по приложению',
        body: 'Используйте нижние вкладки: Дети — список, Отчёты — статистика, Настройки — язык и параметры',
      },
      {
        title: 'Всё готово! 🎉',
        body: 'Теперь вы знаете основы. Начните с добавления первого ребёнка!',
      },
    ],
  },
  search: {
    headerTitle: 'Поиск',
    placeholder: 'Поиск по имени или @username',
    emptyTitle: 'Найдите родителей',
    emptyBody: 'Введите имя или @username чтобы найти пользователей',
    noResults: 'Никого не найдено',
    loading: 'Поиск...',
  },
  profile: {
    uploadAvatar: 'Сменить фото',
    uploadError: 'Не удалось загрузить фото',
  },
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
  },
  common: {
    loading: 'Загрузка...',
    retry: 'Повторить',
    tryAgain: 'Попробуйте снова',
    error: 'Ошибка',
    success: 'Успешно',
    cancel: 'Отмена',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Редактировать',
    confirm: 'Подтвердить',
  },
};

const uzCyrillic: T = {
  tagline: 'Фарзандларингиз боғи',
  login: {
    title: 'Кириш',
    subtitle: 'Емайлингизни киритинг — код юборамиз',
    emailLabel: 'Емаил манзил',
    emailPlaceholder: 'example@mail.com',
    submit: 'Код олиш',
    noAccount: 'Аккаунт йўқми?',
    registerLink: 'Рўйхатдан ўтиш',
    orDivider: 'ёки',
    google: 'Google орқали кириш',
    googleConfigError: 'Google созланмаган. Email орқали киринг.',
    googleError: 'Google хатолик. Қайта уриниб кўринг.',
    errEmpty: 'Емаил киритинг',
    errInvalid: 'Тўғри емаил киритинг',
    errSend: 'Код юборишда хато',
    errNotFound: 'Аккаунт топилмади. Аввал рўйхатдан ўтинг',
  },
  register: {
    title: 'Аккаунт очиш',
    subtitle: 'Фарзандларингиз боғига кириб кетинг 🌱',
    nameLabel: 'Исмингиз',
    namePlaceholder: 'Масалан: Камола',
    emailLabel: 'Емаил манзил',
    submit: 'Давом этиш',
    hasAccount: 'Аккаунт борми?',
    loginLink: 'Кириш',
    back: 'Орқага',
    errName: 'Исмингизни киритинг',
    errEmail: 'Емаил киритинг',
    errInvalidEmail: 'Тўғри емаил киритинг',
    errSend: 'Код юборишда хато',
    errExists: 'Бу емаил билан аккаунт мавжуд. Киринг',
    errUsername: 'Фойдаланувчи номини киритинг',
    errUsernameTaken: 'Бу ном банд',
    errUsernameFormat: '3–20 белги: ҳарфлар, рақамлар, _',
    usernameLabel: 'Фойдаланувчи номи',
    usernamePlaceholder: 'Масалан: kamola_95',
  },
  otp: {
    titleConfirm: 'Емайлни тасдиқлаш',
    titleLogin: 'Хатдан код',
    subtitle: '8 рақамли код юборилди',
    spamHint: 'Хат келмаса, «Спам» папкасини текширинг',
    back: 'Орқага',
    checking: 'Текшириляпти...',
    confirm: 'Тасдиқлаш',
    resendIn: 'Қайта юбориш орқали:',
    resendBtn: '↺  Кодни қайта юбориш',
    errIncomplete: 'Тўлиқ кодни киритинг',
    errWrong: 'Нотўғри код, қайта уриниб кўринг',
    errNotFound: 'Емаил рўйхатдан ўтмаган. Рўйхатдан ўтинг.',
    seconds: 'с',
  },
  tabs: {
    garden: 'Бош',
    children: 'Оила',
    reports: 'Таҳлил',
    settings: 'Созламалар',
    create: 'Пост',
    ai: 'ЯИ',
    search: 'Қидирув',
  },
  garden: {
    subtitle: 'Боғим 🌿',
    searchPlaceholder: 'Oilalarni qidirish...',
    you: 'Сиз',
    findMore: 'Топиш',
    noResults: 'Натижа топилмади',
    emptyTitle: 'Боғингиз бўш',
    emptyBody: 'Биринчи фарзандингизни қўшинг\nва уларнинг гулини экинг',
    addBtn: 'Фарзанд қўшиш',
    ageLabel: (n) => `${n} ёш`,
  },
  children: {
    title: 'Болалар',
    empty: 'Болалар йўқ. Қўшинг!',
    ageLabel: (n) => `${n} ёш`,
  },
  reports: {
    title: 'Ҳисобот',
    today: 'Бугун',
    screenTime: 'Экран вақти',
    limit: 'Лимит',
    percent: 'Фоиз',
    weekTitle: 'Ҳафта давомида',
    avgTitle: 'Ўртача статистика',
    dailyAvg: 'Кунлик ўртача',
    overLimitDays: 'Лимит ошган кунлар',
    dayUnit: 'кун',
    noChild: 'Бола танланмаган',
    hourSuffix: 'с',
  },
  settings: {
    title: 'Созламалар',
    sectionNotif: 'Билдиришномалар',
    notifications: 'Билдиришномалар',
    sound: 'Товуш',
    sectionLang: 'Тил',
    sectionAbout: 'Дастур ҳақида',
    version: 'Buvijon v1.0.1',
    privacy: 'Махфийлик сиёсати',
    terms: 'Фойдаланиш шартлари',
    logout: 'Чиқиш',
    logoutAlertTitle: 'Чиқиш',
    logoutAlertMsg: 'Ҳисобингиздан чиқмоқчимисиз?',
    logoutCancel: 'Бекор қилиш',
    logoutConfirm: 'Чиқиш',
    usernameLabel: 'Фойдаланувчи номи',
    editAvatarHint: 'Расмни ўзгартириш учун босинг',
  },
  childDetail: {
    notFound: 'Бола топилмади',
    back: 'Орқага',
    ageLabel: (n) => `${n} ёш`,
    today: 'Бугун',
    used: 'Ишлатилди',
    over: 'Ошилди',
    remaining: 'Қолди',
    limit: 'Лимит',
    week: 'Ҳафта',
    settingsSection: 'Созламалар',
    changeLimit: 'Лимитни ўзгартириш',
    blockApps: 'Дастурларни блоклаш',
    editProfile: 'Фарзандни таҳрирлаш',
    editTitle: 'Фарзанд профили',
    editSave: 'Сақлаш',
    editAppsLabel: 'Кузатиладиган иловалар',
    editErrName: 'Исмини киритинг',
    editErrPin: '4 хонали PIN киритинг',
    appsSection: 'Дастурлар',
    launches: 'марта очилди',
    noApps: "Маълумот йўқ",
    grantPermission: 'Рухсат бериш',
    permissionHint: 'Экран вақтини кузатиш учун фойдаланиш статистикасига рухсат керак',
    devAddTime: '[DEV] +15 дақиқа',
    deleteTitle: (name) => `${name}ни ўчириш`,
    deleteMsg: 'Барча маълумотлар ўчирилади. Давом этасизми?',
    deleteCancel: 'Бекор қилиш',
    deleteConfirm: 'Ўчириш',
    hourSuffix: 'с',
  },
  addChild: {
    title: 'Янги бола',
    subtitle: 'Бола қўшинг ва унинг гулини экинг',
    nameLabel: 'Боланинг исми',
    namePlaceholder: 'Масалан: Алинур',
    ageLabel: 'Ёши',
    agePlaceholder: 'Ёш',
    flowerType: 'Гул тури',
    flowerColor: 'Гул ранги',
    pinLabel: 'Бола PIN-коди',
    pinPlaceholder: '4 рақам',
    pinHint: 'PIN қайси бола телефон ишлатаётганини аниқлаш учун керак',
    limitLabel: 'Кунлик экран вақти лимити',
    addBtn: 'Бола қўшиш',
    errName: 'Боланинг исмини киритинг',
    errAge: 'Ёшини киритинг',
    errPin: '4 хонали PIN-код киритинг',
    errSave: 'Сақлашда хато',
  },
  flowerStates: {
    blooming: 'Яхши',
    warning: 'Диққат',
    wilting: 'Ёрдам керак',
  },
  duration: { min: 'дақ', hour: 'соат' },
  dayNames: ['Якш', 'Душ', 'Сеш', 'Чор', 'Пай', 'Жум', 'Шан'],
  posts: {
    title: 'Постлар',
    empty: 'Постлар йўқ',
    like: 'Ёқтириш',
    comment: 'Изоҳ',
    comments: 'Изоҳлар',
    addComment: 'Изоҳ қўшиш',
    commentPlaceholder: 'Изоҳ ёзинг...',
    send: 'Юбориш',
    editPost: 'Таҳрирлаш',
    deletePost: 'Ўчириш',
    archivePost: 'Архивлаш',
    deleteConfirm: 'Ўчириш',
    deleteCancel: 'Бекор',
    deleteMsg: 'Бу пост бутунлай ўчирилади',
    editTitle: 'Постни таҳрирлаш',
    editSave: 'Сақлаш',
    editCancel: 'Бекор',
    you: 'Сиз',
    justNow: 'Ҳозиргина',
    firstPostCta: 'Болангиз ҳақида биринчи постингизни ёзинг!',
    firstPostBtn: 'Пост ёзиш',
    showMore: 'Кўпроқ кўрсатиш',
  },
  analysis: {
    title: 'Таҳлил',
    todayBtn: 'Бугун',
    weekBtn: 'Ҳафта',
    familyAvg: 'оилавий ўрт.',
    topApp: 'топ-дастур',
    mostImproved: 'яхшиланди',
    childrenLabel: 'болалар',
    stateSafe: 'Норма',
    stateModerate: 'Ўртача',
    stateOverLimit: 'Ошди',
    stateDoctorMode: 'Шифокор режими',
    doctorDay: (n) => `${n}-куни`,
    contactDoctor: 'Шифокорга қўнғироқ',
    usageLevels: 'бугунги фойдаланиш даражаси',
    levelSafe: 'Норма',
    levelFair: 'Яхши',
    levelModerate: 'Ўртача',
    levelRisky: 'Хавф',
    levelDoctor: 'Шифокор',
    explore: 'кўпроқ',
    improvement: 'Яхшиланиш',
    improvementSub: 'Экран вақтини камайтириш тенденцияси',
    mentalCase: 'Руҳий соғлиқ',
    mentalCaseSub: 'Фойдаланиш сифати ва фаровонлик баллари',
    fullDayNames: ['якшанба', 'душанба', 'сешанба', 'чоршанба', 'пайшанба', 'жума', 'шанба'],
    monthNames: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'],
    weeklyInsight: 'ҳафталик таҳлил',
    generating: 'таҳлил тайёрланмоқда...',
    refresh: 'Янгилаш',
    retry: 'Қайта уриниш',
    trends: { improving: 'яхшиланмоқда', worsening: 'ёмонлашмоқда', stable: 'барқарор' },
  },
  ai: {
    headerTitle: 'Buvijon AI',
    headerSub: 'Экран вақти бўйича маслаҳатлар',
    welcome: 'Салом! Мен Buvijon AI-ёрдамчиман. Экран вақти, ёш меъёрлари ёки фарзандларингизга ёрдам бериш ҳақида савол беринг.',
    suggestionsLabel: 'Оммабоп саволлар',
    suggestions: [
      '6 ёшли бола учун экран вақти неча соат бўлиши керак?',
      'Болага экран вақти чекланишини қандай тушунтириш мумкин?',
      'Гаджетга боғлиқликнинг белгилари қандай?',
      'Гаджетлар ўрнига фойдали машғулотни қандай топиш мумкин?',
    ],
    placeholder: 'Савол беринг...',
    demoResponse: 'Бу демо жавоб. Ҳақиқий тавсиялар учун API уланг.',
  },
  create: {
    headerTitle: 'Янги пост',
    cancel: 'Бекор',
    publish: 'Чоп этиш',
    typeLabel: 'Ёзув тури',
    typeProgress: 'Тараққиёт',
    typeMilestone: 'Ютуқ',
    typeTip: 'Маслаҳат',
    typeNote: 'Эслатма',
    contentLabel: 'Мазмун',
    placeholder: 'Фарзандингиз кузатуви ёки ютуғини бўлишинг...',
    tip: 'Постингизни барча Buvijon фойдаланувчилари кўради. Тажрибангизни бўлишинг!',
    addPhoto: 'Расм қўшиш',
    errFailed: 'Постни чоп этиб бўлмади. Қайта уриниб кўринг',
  },
  blockedApps: {
    title: 'Дастурларни блоклаш',
    save: 'Сақлаш',
    info: 'Кунлик экран вақти лимитига етганда блокланадиган дастурларни танланг.',
    searchPlaceholder: 'Дастурларни қидириш...',
    selectedCount: (n: number) => `${n} блокланган`,
    overlayTitle: 'Рухсат керак',
    overlayMsg: 'Дастурларни блоклаш учун бошқа дастурлар устидан кўрсатиш рухсати керак.',
    overlayGrant: 'Созламаларни очиш',
    categories: {
      social: 'Ижтимоий',
      game: 'Ўйин',
      video: 'Видео',
      education: 'Таълим',
      messenger: 'Мессенжер',
      browser: 'Браузер',
      utility: 'Восита',
      other: 'Бошқа',
    },
    riskLevels: {
      low: 'паст хавф',
      medium: 'ўрта хавф',
      high: 'юқори хавф',
    },
  },
  parentPin: {
    title: 'Ота-оналликниши ҳароҳати',
    subtitle: 'ПИН ёки биометрия орқали буланингларни ҳароларини ҳимқонг',
    pinLabel: 'ПИН-код',
    pinPlaceholder: '4 тақам',
    biometricLabel: 'Биометрия',
    biometricPrompt: 'Тасдиқлашинг, сиз отанингсиқсиз',
    unlockBtn: 'Очиш',
    cancelBtn: 'Бекор қилиш',
    wrongPin: 'Ноъва ПИН-код',
    settingsTitle: 'Кириш ҳаролар',
    biometricToggle: 'Биометрия билан кириш',
    biometricEnabled: 'Ёқув қилинган',
    biometricDisabled: 'Ўчириб қилинган',
    pinRemoved: 'ПИН-код ўчирилди',
    setupTitle: 'ПИН-код яратиш',
    setupSubtitle: 'Буланингларни ҳароларини ҳимқонлаш учун 4-тақамли ПИН-кодни ўрнатинг',
    setupPinLabel: 'ПИН-код',
    setupPinPlaceholder: '••••',
    setupConfirmLabel: 'ПИН-кодни тасдиқлаш',
    setupBtn: 'Яратиш',
    errPinMismatch: 'ПИН-кодлар мос келмайди',
    errPinLength: '4 тақам киритинг',
    lockTitle: 'Киришни тасдиқланг',
    lockSubtitle: 'Ота-она ПИН-коди ёки биометрия орқали киринг',
    lockHint: "Ота-она ПИН-коди — тўлиқ кириш | Бола ПИН-коди — чекланган режим",
  },
  onboarding: {
    skip: 'Ўтказиш',
    next: 'Кейингиси',
    done: 'Бошлаш!',
    steps: [
      {
        title: 'Buvijonга хуш келибсиз! 🌱',
        body: 'Болаларингизнинг экран вақтини назорат қилинг ва уларнинг гулларини ўстиринг',
      },
      {
        title: 'Бола қўшинг',
        body: '+ тугмасини босинг — биринчи фарзандингизни қўшинг ва боғда гул экинг',
      },
      {
        title: 'Гул — кўрсаткич',
        body: '🟢 Яхши — муаммо йўқ\n🟡 Диққат — лимит яқинлашмоқда\n🔴 Ёрдам керак — лимит ошди',
      },
      {
        title: 'Асосий мeнюлар',
        body: 'Пастдаги тугмалардан фойдаланинг: Болалар — рўйхат, Ҳисобот — статистика, Созламалар — тил',
      },
      {
        title: 'Тайёр! 🎉',
        body: 'Асосларни билиб олдингиз. Биринчи фарзандингизни қўшишдан бошланг!',
      },
    ],
  },
  search: {
    headerTitle: 'Қидирув',
    placeholder: 'Исм ёки @username бўйича қидириш',
    emptyTitle: 'Ота-оналарни топинг',
    emptyBody: 'Фойдаланувчиларни топиш учун исм ёки @username киритинг',
    noResults: 'Ҳеч ким топилмади',
    loading: 'Қидириляпти...',
  },
  profile: {
    uploadAvatar: 'Расмни ўзгартириш',
    uploadError: 'Расмни юклаб бўлмади',
  },
  messages: {
    title: 'Хабарлар',
    familyStanding: 'Оила рейтинги',
    perspectiveView: 'Кўриниш: ',
    allKidsView: 'Барча болалар',
    all: 'Барчаси',
    searchPlaceholder: 'Чатларни қидириш...',
    createChat: 'Чат яратиш',
    joinFamily: 'Оилага қўшилиш',
    enterInviteCode: 'Таклиф кодини киритинг',
    join: 'Қўшилиш',
    searchMembers: 'Иштирокчиларни қидириш...',
    noMembersFound: 'Иштирокчилар топилмади',
    noFamilyMembers: 'Оила аъзолари йўқ',
    noRanking: 'Рейтинг маълумотлари йўқ',
    noChats: 'Чатлар йўқ',
    startChat: 'Чатни бошлаш',
    startChatWith: ' билан чатни бошлаш',
  },
  common: {
    loading: 'Юкланмоқда...',
    retry: 'Қайта уриниб кўринг',
    tryAgain: 'Қайта уриниб кўринг',
    error: 'Хато',
    success: 'Мувоффақият',
    cancel: 'Бекор қилиш',
    save: 'Сақлаш',
    delete: 'Ўчириш',
    edit: 'Таҳрирлаш',
    confirm: 'Тасдиқлаш',
  },
};

const uzLatin: T = {
  tagline: "Farzandlaringiz bog'i",
  login: {
    title: 'Kirish',
    subtitle: 'Emailingizni kiriting — kod yuboramiz',
    emailLabel: 'Email manzil',
    emailPlaceholder: 'example@mail.com',
    submit: 'Kod olish',
    noAccount: "Akkaunt yo'qmi?",
    registerLink: "Ro'yxatdan o'tish",
    orDivider: 'yoki',
    google: 'Google orqali kirish',
    googleConfigError: "Google sozlanmagan. Email orqali kiring.",
    googleError: "Google xatolik. Qayta urining.",
    errEmpty: 'Email kiriting',
    errInvalid: "To'g'ri email kiriting",
    errSend: 'Kod yuborishda xato',
    errNotFound: "Akkaunt topilmadi. Avval ro'yxatdan o'ting",
  },
  register: {
    title: 'Akkaunt ochish',
    subtitle: "Farzandlaringiz bog'iga kiring 🌱",
    nameLabel: 'Ismingiz',
    namePlaceholder: 'Masalan: Kamola',
    emailLabel: 'Email manzil',
    submit: 'Davom etish',
    hasAccount: 'Akkaunt bormi?',
    loginLink: 'Kirish',
    back: 'Orqaga',
    errName: 'Ismingizni kiriting',
    errEmail: 'Email kiriting',
    errInvalidEmail: "To'g'ri email kiriting",
    errSend: 'Kod yuborishda xato',
    errExists: "Bu email bilan akkaunt mavjud. Kiring",
    errUsername: 'Foydalanuvchi nomini kiriting',
    errUsernameTaken: 'Bu nom band',
    errUsernameFormat: "3–20 belgi: harflar, raqamlar, _",
    usernameLabel: 'Foydalanuvchi nomi',
    usernamePlaceholder: 'masalan: kamola_95',
  },
  otp: {
    titleConfirm: 'Emailni tasdiqlash',
    titleLogin: 'Xatdan kod',
    subtitle: '8 raqamli kod yuborildi',
    spamHint: "Xat kelmasa, «Spam» papkasini tekshiring",
    back: 'Orqaga',
    checking: 'Tekshirilyapti...',
    confirm: 'Tasdiqlash',
    resendIn: 'Qayta yuborish orqali:',
    resendBtn: "↺  Kodni qayta yuborish",
    errIncomplete: "To'liq kodni kiriting",
    errWrong: "Noto'g'ri kod, qayta urining",
    errNotFound: "Email ro'yxatdan o'tmagan. Ro'yxatdan o'ting.",
    seconds: 's',
  },
  tabs: {
    garden: 'Bosh',
    children: 'Oila',
    reports: 'Tahlil',
    settings: 'Sozlamalar',
    create: 'Post',
    ai: 'AI',
    search: 'Qidiruv',
  },
  garden: {
    subtitle: "Bog'im 🌿",
    searchPlaceholder: 'Oilalarni qidirish...',
    you: 'Siz',
    findMore: 'Topish',
    noResults: 'Natija topilmadi',
    emptyTitle: "Bog'ingiz bo'sh",
    emptyBody: "Birinchi farzandingizni qo'shing\nva uning gulini eking",
    addBtn: "Farzand qo'shish",
    ageLabel: (n) => `${n} yosh`,
  },
  children: {
    title: 'Bolalar',
    empty: "Bolalar yo'q. Qo'shing!",
    ageLabel: (n) => `${n} yosh`,
  },
  reports: {
    title: 'Hisobot',
    today: 'Bugun',
    screenTime: 'Ekran vaqti',
    limit: 'Limit',
    percent: 'Foiz',
    weekTitle: 'Hafta davomida',
    avgTitle: "O'rtacha statistika",
    dailyAvg: 'Kunlik o\'rtacha',
    overLimitDays: 'Limit oshgan kunlar',
    dayUnit: 'kun',
    noChild: 'Bola tanlanmagan',
    hourSuffix: 's',
  },
  settings: {
    title: 'Sozlamalar',
    sectionNotif: 'Bildirishnomalar',
    notifications: 'Bildirishnomalar',
    sound: 'Tovush',
    sectionLang: 'Til',
    sectionAbout: 'Dastur haqida',
    version: 'Buvijon v1.0.1',
    privacy: 'Maxfiylik siyosati',
    terms: 'Foydalanish shartlari',
    logout: 'Chiqish',
    logoutAlertTitle: 'Chiqish',
    logoutAlertMsg: 'Hisobingizdan chiqmoqchimisiz?',
    logoutCancel: 'Bekor qilish',
    logoutConfirm: 'Chiqish',
    usernameLabel: 'Foydalanuvchi nomi',
    editAvatarHint: "Rasmni o'zgartirish uchun bosing",
  },
  childDetail: {
    notFound: 'Bola topilmadi',
    back: 'Orqaga',
    ageLabel: (n) => `${n} yosh`,
    today: 'Bugun',
    used: 'Ishlatildi',
    over: 'Oshildi',
    remaining: 'Qoldi',
    limit: 'Limit',
    week: 'Hafta',
    settingsSection: 'Sozlamalar',
    changeLimit: "Limit qo'yish",
    blockApps: 'Xavfsizlik',
    editProfile: 'Farzandni tahrirlash',
    editTitle: 'Farzand profili',
    editSave: 'Saqlash',
    editAppsLabel: 'Kuzatiladigan ilovalar',
    editErrName: 'Ismni kiriting',
    editErrPin: '4 xonali PIN kiriting',
    appsSection: 'Ilovalar',
    launches: 'marta ochildi',
    noApps: "Ma'lumot yo'q",
    grantPermission: 'Ruxsat berish',
    permissionHint: "Ekran vaqtini kuzatish uchun foydalanish statistikasiga ruxsat kerak",
    devAddTime: '[DEV] +15 daqiqa',
    deleteTitle: (name) => `${name}ni o'chirish`,
    deleteMsg: "Barcha ma'lumotlar o'chiriladi. Davom etasizmi?",
    deleteCancel: 'Bekor qilish',
    deleteConfirm: "O'chirish",
    hourSuffix: 's',
  },
  addChild: {
    title: 'Yangi bola',
    subtitle: "Bola qo'shing va uning gulini eking",
    nameLabel: 'Bolaning ismi',
    namePlaceholder: 'Masalan: Alinur',
    ageLabel: 'Yoshi',
    agePlaceholder: 'Yosh',
    flowerType: 'Gul turi',
    flowerColor: 'Gul rangi',
    pinLabel: 'Bola PIN-kodi',
    pinPlaceholder: '4 raqam',
    pinHint: "PIN qaysi bola telefon ishlatayotganini aniqlash uchun kerak",
    limitLabel: 'Kunlik ekran vaqti limiti',
    addBtn: "Bola qo'shish",
    errName: 'Bolaning ismini kiriting',
    errAge: 'Yoshini kiriting',
    errPin: "4 xonali PIN-kod kiriting",
    errSave: 'Saqlashda xato',
  },
  flowerStates: {
    blooming: 'Yaxshi',
    warning: 'Diqqat',
    wilting: 'Yordam kerak',
  },
  duration: { min: 'daq', hour: 's' },
  dayNames: ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'],
  posts: {
    title: 'Postlar',
    empty: "Postlar yo'q",
    like: 'Yoqtirish',
    comment: 'Izoh',
    comments: 'Izohlar',
    addComment: "Izoh qo'shish",
    commentPlaceholder: 'Izoh yozing...',
    send: 'Yuborish',
    editPost: 'Tahrirlash',
    deletePost: "O'chirish",
    archivePost: 'Arxivlash',
    deleteConfirm: "O'chirish",
    deleteCancel: 'Bekor',
    deleteMsg: "Bu post butunlay o'chiriladi",
    editTitle: 'Postni tahrirlash',
    editSave: 'Saqlash',
    editCancel: 'Bekor',
    you: 'Siz',
    justNow: 'Hozirgina',
    firstPostCta: 'Bolangiz haqida birinchi postingizni yozing!',
    firstPostBtn: 'Post yozish',
    showMore: "Ko'proq ko'rsatish",
  },
  analysis: {
    title: 'Tahlil',
    todayBtn: 'Bugun',
    weekBtn: 'Hafta',
    familyAvg: "oilaviy o'rt.",
    topApp: 'top-dastur',
    mostImproved: 'yaxshilandi',
    childrenLabel: 'bolalar',
    stateSafe: 'Norma',
    stateModerate: "O'rtacha",
    stateOverLimit: 'Oshdi',
    stateDoctorMode: 'Shifokor rejimi',
    doctorDay: (n) => `${n}-kuni`,
    contactDoctor: "Shifokorga qo'ng'iroq",
    usageLevels: 'bugungi foydalanish darajasi',
    levelSafe: 'Norma',
    levelFair: 'Yaxshi',
    levelModerate: "O'rtacha",
    levelRisky: 'Xavf',
    levelDoctor: 'Shifokor',
    explore: "ko'proq",
    improvement: 'Yaxshilanish',
    improvementSub: 'Ekran vaqtini kamaytirish tendensiyasi',
    mentalCase: 'Ruhiy salomatlik',
    mentalCaseSub: "Foydalanish sifati va farovonlik ballari",
    fullDayNames: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
    monthNames: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    weeklyInsight: 'haftalik tahlil',
    generating: 'tahlil tayyorlanmoqda...',
    refresh: 'Yangilash',
    retry: 'Qayta urinish',
    trends: { improving: 'yaxshilanmoqda', worsening: 'yomonlashmoqda', stable: 'barqaror' },
  },
  ai: {
    headerTitle: 'Buvijon AI',
    headerSub: 'Ekran vaqti bo\'yicha maslahatlar',
    welcome: 'Salom! Men Buvijon AI-yordamchiman. Ekran vaqti, yosh me\'yorlari yoki farzandlaringizga yordam berish haqida savol bering.',
    suggestionsLabel: 'Ommabop savollar',
    suggestions: [
      '6 yoshli bola uchun ekran vaqti necha soat bo\'lishi kerak?',
      'Bolaga ekran vaqti cheklanishini qanday tushuntirish mumkin?',
      'Gadjetga bog\'liqlikning belgilari qanday?',
      'Gadjetlar o\'rniga foydali mashg\'ulotni qanday topish mumkin?',
    ],
    placeholder: 'Savol bering...',
    demoResponse: 'Bu demo javob. Haqiqiy tavsiyalar uchun API ulang.',
  },
  create: {
    headerTitle: 'Yangi post',
    cancel: 'Bekor',
    publish: 'Chop etish',
    typeLabel: 'Yozuv turi',
    typeProgress: 'Taraqqiyot',
    typeMilestone: 'Yutuq',
    typeTip: 'Maslahat',
    typeNote: 'Eslatma',
    contentLabel: 'Mazmun',
    placeholder: 'Farzandingiz kuzatuvi yoki yutuqini bo\'lishing...',
    tip: 'Postingizni barcha Buvijon foydalanuvchilari ko\'radi. Tajribangizni bo\'lishing!',
    addPhoto: 'Rasm qo\'shish',
    errFailed: 'Postni chop etib bo\'lmadi. Qayta urinib ko\'ring',
  },
  blockedApps: {
    title: 'Dasturlarni bloklash',
    save: 'Saqlash',
    info: 'Kunlik ekran vaqti limitiga yetganda bloklanadigan dasturlarni tanlang.',
    searchPlaceholder: 'Dasturlarni qidirish...',
    selectedCount: (n: number) => `${n} bloklangan`,
    overlayTitle: 'Ruxsat kerak',
    overlayMsg: 'Dasturlarni bloklash uchun boshqa dasturlar ustidan ko\'rsatish ruxsati kerak.',
    overlayGrant: 'Sozlamalarni ochish',
    categories: {
      social: 'Ijtimoiy',
      game: "O'yin",
      video: 'Video',
      education: "Ta'lim",
      messenger: 'Messenjer',
      browser: 'Brauzer',
      utility: 'Vosita',
      other: 'Boshqa',
    },
    riskLevels: {
      low: 'past xavf',
      medium: "o'rta xavf",
      high: 'yuqori xavf',
    },
  },
  parentPin: {
    title: 'Ota-ona kirishni himoyalang',
    subtitle: 'PIN yoki biometriya orqali bolanlarning bolalarini himoyalang',
    pinLabel: 'PIN-kod',
    pinPlaceholder: '4 ta raqam',
    biometricLabel: 'Biometriya',
    biometricPrompt: 'Tasdiqlashing, siz ota-siz ekansiz',
    unlockBtn: 'Ochish',
    cancelBtn: 'Bekor qilish',
    wrongPin: 'Noto\'gri PIN-kod',
    settingsTitle: 'Kirish sozlamalari',
    biometricToggle: 'Biometriya bilan kirish',
    biometricEnabled: 'Yoqilgan',
    biometricDisabled: 'O\'chirilgan',
    pinRemoved: 'PIN-kod o\'chirildi',
    setupTitle: 'PIN-kod yaratish',
    setupSubtitle: 'Bolanlarning bolalarini himoyalash uchun 4-xonali PIN-kodni o\'rnating',
    setupPinLabel: 'PIN-kod',
    setupPinPlaceholder: '••••',
    setupConfirmLabel: 'PIN-kodni tasdiqlash',
    setupBtn: 'Yaratish',
    errPinMismatch: 'PIN-kodlar mos kelmaydi',
    errPinLength: '4 ta raqam kiriting',
    lockTitle: 'Kirishni tasdiqlang',
    lockSubtitle: 'Ota-ona PIN-kodi yoki biometriya orqali kiring',
    lockHint: "Ota-ona PIN-kodi — to'liq kirish | Bola PIN-kodi — cheklangan rejim",
  },
  onboarding: {
    skip: "O'tkazish",
    next: 'Keyingisi',
    done: 'Boshlash!',
    steps: [
      {
        title: "Buvijon'ga xush kelibsiz! 🌱",
        body: "Farzandlaringiz ekran vaqtini nazorat qiling va ularning gullarini o'stiring",
      },
      {
        title: "Bola qo'shing",
        body: "+ tugmasini bosing — birinchi farzandingizni qo'shing va bog'da gul eking",
      },
      {
        title: "Gul — ko'rsatkich",
        body: "🟢 Yaxshi — muammo yo'q\n🟡 Diqqat — limit yaqinlashmoqda\n🔴 Yordam kerak — limit oshdi",
      },
      {
        title: 'Asosiy menyular',
        body: "Quyi tugmalardan foydalaning: Bolalar — ro'yxat, Hisobot — statistika, Sozlamalar — til",
      },
      {
        title: 'Tayyor! 🎉',
        body: "Asoslarni bilib oldingiz. Birinchi farzandingizni qo'shishdan boshlang!",
      },
    ],
  },
  search: {
    headerTitle: 'Qidiruv',
    placeholder: "Ism yoki @username bo'yicha qidirish",
    emptyTitle: 'Ota-onalarni toping',
    emptyBody: "Foydalanuvchilarni topish uchun ism yoki @username kiriting",
    noResults: 'Hech kim topilmadi',
    loading: 'Qidirilmoqda...',
  },
  profile: {
    uploadAvatar: "Rasmni o'zgartirish",
    uploadError: "Rasmni yuklab bo'lmadi",
  },
  messages: {
    title: 'Xabarlar',
    familyStanding: "Oila reytingi",
    perspectiveView: "Ko'rinish: ",
    allKidsView: "Barcha bolalar",
    all: 'Barchasi',
    searchPlaceholder: "Chatlarni qidirish...",
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
  },
  common: {
    loading: 'Yuklanmoqda...',
    retry: 'Qayta urinib ko\'ring',
    tryAgain: 'Qayta urinib ko\'ring',
    error: 'Xato',
    success: 'Muvoffaqiyat',
    cancel: 'Bekor qilish',
    save: 'Saqlash',
    delete: "O'chirish",
    edit: 'Tahrirlash',
    confirm: 'Tasdiqlash',
  },
};

export const translations: Record<Lang, T> = {
  ru: ru,
  'uz-cyrillic': uzCyrillic,
  'uz-latin': uzLatin,
};

export function useTranslation(): T {
  const language = useSettingsStore(s => s.language) as Lang;
  return translations[language] ?? translations['uz-latin'];
}

/** Language-aware duration formatter */
export function formatDurationT(minutes: number, t: T): string {
  if (minutes < 1) return `0 ${t.duration.min}`;
  if (minutes < 60) return `${minutes} ${t.duration.min}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ${t.duration.hour}`;
  return `${h} ${t.duration.hour} ${m} ${t.duration.min}`;
}
