// Offline RU/EN UI locale. Russian remains the stored/data language; EN is display-only.
// No framework: one dictionary + language switch (localStorage cyberred-lang).
(function (global) {
  const LANG_KEY = 'cyberred-lang';
  const SUPPORTED = ['ru', 'en'];

  const EN_PHRASES = {
  "CYBERPUNK RED // Интерактивный лист": "CYBERPUNK RED // Interactive Sheet",
  "ПРЕИМУЩЕСТВО": "ADVANTAGE",
  "ПОМЕХА": "DISADVANTAGE",
  "Печать листа текущего персонажа": "Print the current character sheet",
  "Печать": "Print",
  "Пустой лист персонажа для заполнения от руки": "Blank character sheet to fill by hand",
  "Бланк": "Blank",
  "Очистить": "Clear",
  "Экспорт JSON": "Export JSON",
  "Импорт JSON": "Import JSON",
  "Разделы листа": "Sheet sections",
  "00 // Панель": "00 // Dashboard",
  "01 // Персонаж": "01 // Character",
  "02 // Навыки": "02 // Skills",
  "03 // Снаряжение": "03 // Gear",
  "04 // Жизненный путь": "04 // Lifepath",
  "05 // Киберимпланты": "05 // Cyberware",
  "06 // Роль": "06 // Role",
  "АВТОСОХРАНЕНИЕ ВКЛ.": "AUTOSAVE ON",
  "Персонаж": "Character",
  "Новый персонаж": "New character",
  "+ НОВЫЙ": "+ NEW",
  "Удалить персонажа": "Delete character",
  "УДАЛИТЬ": "DELETE",
  "1d10 + РЕА": "1d10 + REF",
  "ИНИЦИАТИВА": "INITIATIVE",
  "КУБИК // 1D10": "DICE // 1D10",
  "Модификации оружия": "Weapon attachments",
  "Пустой лист или готовый шаблон Streetrat из книги (роль 4, снаряжение и кибер).": "Blank sheet or a Streetrat template from the book (Role Ability 4, gear and cyber).",
  "Свой (пустой лист)": "Custom (blank sheet)",
  "ШАБЛОН STREETRAT": "STREETRAT TEMPLATE",
  "Отмена": "Cancel",
  "Кубик Cyberpunk RED": "Cyberpunk RED dice",
  "КУБИК // NETRUNNER": "DICE // NETRUNNER",
  "+ ДОБАВИТЬ КУБИК": "+ ADD DIE",
  "МОДИФИКАТОР": "MODIFIER",
  "Удача восстанавливается в начале каждой игровой сессии": "Luck restores at the start of each session",
  "НОВАЯ СЕССИЯ: ВОССТАНОВИТЬ УДАЧУ": "NEW SESSION: RESTORE LUCK",
  "БРОСИТЬ": "ROLL",
  "ПАНЕЛЬ ИГРОКА": "PLAYER DASHBOARD",
  "СИСТЕМА ГОТОВА": "SYSTEM READY",
  "СЕССИЯ": "SESSION",
  "Название сессии": "Session title",
  "Ночная смена в Хейвуде": "Night shift in Heywood",
  "Текущая сцена": "Current scene",
  "Где сейчас находится команда?": "Where is the crew right now?",
  "ПОСЛЕДНИЕ БРОСКИ": "RECENT ROLLS",
  "ОЧИСТИТЬ": "CLEAR",
  "Пока нет бросков.": "No rolls yet.",
  "ЗАМЕТКИ ИГРОКА": "PLAYER NOTES",
  "Улики, NPC, обещания, важные детали...": "Clues, NPCs, promises, important details...",
  "Загрузить портрет": "Upload portrait",
  "Имя персонажа": "Character name",
  "Введите имя": "Enter a name",
  "Роль": "Role",
  "Ранг способности роли: 1–10, при создании персонажа — 4": "Role Ability rank: 1–10; 4 at character creation",
  "Ранг": "Rank",
  "Особая способность": "Role Ability",
  "Репутация": "Reputation",
  "Евродоллары": "Eurodollars",
  "Очки улучшения: в режиме игры тратятся на повышение навыков": "Improvement Points: spent to raise skills in play",
  "Очки улучшения (IP)": "Improvement Points (IP)",
  "ХАРАКТЕРИСТИКИ": "STATS",
  "Хиты": "HP",
  "Текущее здоровье": "Current HP",
  "Испытание против смерти: 1d10 должен быть меньше ТЕЛ": "Death Save: 1d10 must be under BODY",
  "Испытание смерти": "Death Save",
  "Порог ранения": "Seriously Wounded",
  "Перемещение за ход: СКО × 2 метров (на поле боя — СКО клеток). Штраф брони и смертельного ранения учтены": "Move per turn: MOVE × 2 meters (MOVE squares on the battlemap). Armor and Mortally Wounded penalties included",
  "Перемещение": "Move",
  "БРОНЯ": "ARMOR",
  "ТЕКУЩЕЕ / МАКС.": "CURRENT / MAX",
  "Броня головы": "Head armor",
  "Броня тела": "Body armor",
  "Голова: SP": "Head: SP",
  "Текущее SP головы": "Current head SP",
  "из": "of",
  "Максимальное SP головы": "Max head SP",
  "Тело: SP": "Body: SP",
  "Текущее SP тела": "Current body SP",
  "Максимальное SP тела": "Max body SP",
  "Вычитается из РЕА, ЛВК и СКО в навыках, бросках и скорости": "Subtracted from REF, DEX and MOVE in skills, rolls and speed",
  "Штраф РЕА/ЛВК/СКО": "REF/DEX/MOVE penalty",
  "Мастер модернизации Техника (стр. 148): +1 SP предмету, у которого есть SP": "Tech Upgrade (p.148): +1 SP to an item that has SP",
  "Голова: модернизация Техника +1 SP": "Head: Tech upgrade +1 SP",
  "Тело: модернизация Техника +1 SP": "Body: Tech upgrade +1 SP",
  "Урон": "Damage",
  "Куда": "Location",
  "Тело": "Body",
  "Голова (×2)": "Head (×2)",
  "Патроны и особый урон: AP −2 SP; резина — без травм и абляции, минимум 1 ПЗ; экспансивные — «Инородное тело»": "Ammo and special damage: AP −2 SP; rubber — no injuries/ablation, min 1 HP; expansive — Foreign Object",
  "Вид": "Type",
  "Обычный": "Normal",
  "Ближний (SP ÷ 2)": "Melee (SP ÷ 2)",
  "Бронебойные (SP −2)": "Armor-Piercing (SP −2)",
  "Резиновые": "Rubber",
  "Экспансивные": "Expansive",
  "Мимо брони": "Ignores armor",
  "Две и больше шестёрок на кубиках урона: бросок 2d6 по таблице травм и +5 урона в хиты": "Two or more sixes on damage dice: roll 2d6 on the injury table and +5 damage to HP",
  "Критическая травма (две шестёрки)": "Critical Injury (two sixes)",
  "ПРИНЯТЬ УРОН": "APPLY DAMAGE",
  "ПОЧИНИТЬ БРОНЮ": "REPAIR ARMOR",
  "ЗДОРОВЬЕ": "HEALTH",
  "Тяжёлое ранение": "Seriously Wounded",
  "Испытание против смерти": "Death Save",
  "БРОСОК 1D10": "ROLL 1D10",
  "СОСТОЯНИЕ": "CONDITION",
  "КРИТИЧЕСКИЕ ТРАВМЫ": "CRITICAL INJURIES",
  "Запишите критические травмы...": "Record critical injuries...",
  "ЗАВИСИМОСТИ": "ADDICTIONS",
  "Запишите зависимости...": "Record addictions...",
  "НАВЫКИ": "SKILLS",
  "РЕЖИМ СОЗДАНИЯ": "CHARACTER CREATION",
  "ОСТАЛОСЬ ОЧКОВ:": "POINTS LEFT:",
  "ОЧКИ УЛУЧШЕНИЯ:": "IMPROVEMENT POINTS:",
  "В режиме создания уровень навыка ограничен 6, общий пул — 86 очков, навыки с пометкой (x2) стоят 2 очка за уровень, базовые навыки (Б) — не ниже 2. Кнопка «+» добавляет ещё один язык, знание местности, боевое искусство, инструмент или науку. В режиме игры навыки повышаются за очки улучшения (IP).": "In creation mode skill level is capped at 6, pool is 86 points, (x2) skills cost 2 per level, basic skills (B) cannot go below 2. “+” adds another Language, Local Expert, Martial Art, Play Instrument, or Science. In play, skills rise with Improvement Points (IP).",
  "ПОИСК НАВЫКА": "SKILL SEARCH",
  "Например: скрытность, техника, стрельба...": "e.g. Stealth, Technique, firearms...",
  "Категории навыков": "Skill categories",
  "Все ▾": "All ▾",
  "СНАРЯЖЕНИЕ": "GEAR",
  "Предметы, оружие и боекомплект персонажа.": "The character’s items, weapons, and ammo.",
  "Предмет": "Item",
  "Кол-во": "Qty",
  "Заметка": "Note",
  "+ ДОБАВИТЬ ПРЕДМЕТ": "+ ADD ITEM",
  "БОЕПРИПАСЫ": "AMMUNITION",
  "Калибр": "Caliber",
  "Тип": "Type",
  "Свойство и цена": "Property and price",
  "+ ДОБАВИТЬ БОЕПРИПАСЫ": "+ ADD AMMO",
  "ОРУЖИЕ": "WEAPONS",
  "Оружие": "Weapon",
  "Навык": "Skill",
  "Патроны сейчас; пусто — не считать": "Rounds now; empty = do not track",
  "Патр.": "Rnd.",
  "Размер магазина": "Magazine size",
  "Маг.": "Mag.",
  "Автоматический огонь (очередь): доступен пистолетам-пулемётам и штурмовым винтовкам": "Autofire: available to SMGs and assault rifles",
  "Авто": "Auto",
  "Какими патронами заряжено; перезарядка берёт их из «Боеприпасов»": "Loaded ammo; reload draws from Ammunition",
  "Боеприпасы": "Ammo",
  "Заметки": "Notes",
  "+ ДОБАВИТЬ ОРУЖИЕ": "+ ADD WEAPON",
  "БОЕВЫЕ ДЕЙСТВИЯ": "COMBAT ACTIONS",
  "В ЗАХВАТЕ: −2 КО ВСЕМ ДЕЙСТВИЯМ": "GRAPPLED: −2 TO ALL ACTIONS",
  "Число на кнопке — что прибавляется к 1d10, нажмите, чтобы бросить. Нажмите на название — правило из книги. Атака, автоогонь, подавляющий огонь и перезарядка — в таблице оружия выше.": "The number on the button is added to 1d10 — click to roll. Click the name for the book rule. Attack, autofire, suppressive fire, and reload are in the weapon table above.",
  "ЖИЗНЕННЫЙ ПУТЬ": "LIFEPATH",
  "История, которая делает персонажа живым.": "The story that makes the character real.",
  "СВЯЗИ": "RELATIONSHIPS",
  "Кто это?": "Who are they?",
  "Что ему нужно?": "What do they want?",
  "+ ДОБАВИТЬ СВЯЗЬ": "+ ADD RELATIONSHIP",
  "РОЛЕВОЙ ЖИЗНЕННЫЙ ПУТЬ": "ROLE LIFEPATH",
  "Запишите важные события, цели и поворотные моменты...": "Record key events, goals, and turning points...",
  "КИБЕРИМПЛАНТЫ": "CYBERWARE",
  "Человечность": "Humanity",
  "Сумма потери человечности (ПЧ) от имплантов и текущая ЭМП": "Total Humanity Loss (HL) from implants and current EMP",
  "Схема тела": "Body diagram",
  "НЕКОММЕРЧЕСКИЙ ЛИСТ ПЕРСОНАЖА // ДАННЫЕ ХРАНЯТСЯ ТОЛЬКО В ВАШЕМ БРАУЗЕРЕ": "FAN CHARACTER SHEET // DATA STAYS ONLY IN YOUR BROWSER",
  "CYBERPUNK RED // Лист Мастера": "CYBERPUNK RED // Game Master Sheet",
  "Печать карточек противников: отмеченных галочкой или всех": "Print enemy cards: checked ones or all",
  "Открыть лист персонажа": "Open character sheet",
  "Лист игрока": "Player sheet",
  "Разделы листа мастера": "GM sheet sections",
  "00 // Сессия": "00 // Session",
  "01 // Противники": "01 // Enemies",
  "02 // Инициатива": "02 // Initiative",
  "03 // NPC и заметки": "03 // NPCs & notes",
  "04 // Бестиарий и сцены": "04 // Bestiary & scenes",
  "05 // Сеть": "05 // NET",
  "06 // Генераторы": "06 // Generators",
  "07 // Бой: правила": "07 // Combat: rules",
  "08 // Справочник": "08 // Reference",
  "09 // Экономика": "09 // Economy",
  "10 // Развлечения": "10 // Fun",
  "Календарь — вкладка «Генераторы»": "Calendar — Generators tab",
  "Кубик мастера": "GM dice",
  "КУБИК // GM": "DICE // GM",
  "Закрыть": "Close",
  "КУБИКИ": "DICE",
  "ПАНЕЛЬ МАСТЕРА": "GM DASHBOARD",
  "Где команда, что происходит, кто рядом?": "Where is the crew, what’s happening, who’s nearby?",
  "Цели и зацепки": "Goals and hooks",
  "Что должно случиться, что игроки могут найти...": "What should happen, what players might find...",
  "ПОЛЕ БОЯ": "BATTLEFIELD",
  "ИГРОКИ": "PLAYERS",
  "ЧТО ЗНАЕТ МАСТЕР": "WHAT THE GM KNOWS",
  "Игрок": "Player",
  "+ ИГРОК": "+ PLAYER",
  "Взять персонажей из листов игрока, открытых в этом же браузере": "Pull characters from player sheets open in this browser",
  "ИЗ ЛИСТОВ БРАУЗЕРА": "FROM BROWSER SHEETS",
  "Файлы «Экспорт JSON» из листа игрока; можно выбрать несколько": "“Export JSON” files from the player sheet; multi-select OK",
  "ИМПОРТ ЛИСТА JSON": "IMPORT SHEET JSON",
  "ИГРОКОВ В ИНИЦИАТИВУ": "PLAYERS TO INITIATIVE",
  "ЗАМЕТКИ МАСТЕРА": "GM NOTES",
  "Секреты, импровизация, что сказали игроки...": "Secrets, improv, what players said...",
  "ПРОТИВНИКИ": "ENEMIES",
  "Вернуть": "Undo",
  "СОХРАНЕНО": "SAVED",
  "ОШИБКА СОХРАНЕНИЯ: НЕТ МЕСТА": "SAVE ERROR: OUT OF SPACE",
  "Без имени": "Unnamed",
  "ПОПАДАНИЕ": "ATTACK",
  "УРОН ОЧЕРЕДИ": "AUTOFIRE DAMAGE",
  "ЭФФЕКТ": "EFFECT",
  "УРОН": "DAMAGE",
  "ПОДАВЛ.": "SUPPRESS",
  "↻ Перезарядка": "↻ Reload",
  "Перезарядка": "Reload",
  "МОД": "ATTACH",
  "КАЧ.": "QUAL.",
  "СТАНД.": "STD.",
  "ОТЛ.": "EXC.",
  "НИЗК.": "POOR",
  "Все": "All",
  "ПОВСЕДНЕВНАЯ ЖИЗНЬ": "LIFESTYLE",
  "Улучшения": "Upgrades",
  "Нет очков в Отражении / Слабом месте": "No points in Combat Awareness / Weak Spot",
  "травмы": "injuries",
  "травма глаза": "eye injury",
  "разрыв мышцы": "torn muscle",
  "Обнаружение угроз": "Threat Detection",
  "Полевая экспертиза (не для работ Создателя)": "Field Expertise (not Maker jobs)",
  "Мото": "Moto",
  "все травмы этой зоны уже есть": "all injuries for this zone already exist",
  "тело": "body",
  "голова": "head",
  "Язык": "Language",
  "ИНТ": "INT",
  "РЕА": "REF",
  "ЛВК": "DEX",
  "ТЕХ": "TECH",
  "ХАР": "COOL",
  "ВОЛЯ": "WILL",
  "УДЧ": "LUCK",
  "СКО": "SPD",
  "ТЕЛ": "BODY",
  "ЭМП": "EMP",
  "ВОЛ": "WILL",
  "РЕФ": "REF",
  "Интеллект": "Intelligence",
  "Сила воли": "Willpower",
  "Харизма": "Cool",
  "Эмпатия": "Empathy",
  "Техника": "Technique",
  "Реакция": "Reflexes",
  "Удача": "Luck",
  "Телосложение": "Body",
  "Ловкость": "Dexterity",
  "Скорость": "Movement",
  "Навыки восприятия": "Awareness Skills",
  "Физические навыки": "Body Skills",
  "Навыки управления": "Control Skills",
  "Навыки ближнего боя": "Fighting Skills",
  "Социальные навыки": "Social Skills",
  "Образовательные навыки": "Education Skills",
  "Сценические навыки": "Performance Skills",
  "Навыки дальнего боя": "Ranged Weapon Skills",
  "Технические навыки": "Technique Skills",
  "Концентрация": "Concentration",
  "Скрытие/раскрытие": "Conceal/Reveal Object",
  "Чтение по губам": "Lip Reading",
  "Внимательность": "Perception",
  "Выслеживание": "Tracking",
  "Атлетика": "Athletics",
  "Акробатика": "Contortionist",
  "Танец": "Dance",
  "Выносливость": "Endurance",
  "Сопрот. пыткам/наркотикам": "Resist Torture/Drugs",
  "Скрытность": "Stealth",
  "Вождение": "Drive Land Vehicle",
  "Пилотирование (x2)": "Pilot Air Vehicle (x2)",
  "Судовождение": "Pilot Sea Vehicle",
  "Верховая езда": "Riding",
  "Рукопашный бой": "Brawling",
  "Уклонение": "Evasion",
  "Боевые искусства (x2)": "Martial Arts (x2)",
  "Оружие ближнего боя": "Melee Weapon",
  "Подкуп": "Bribery",
  "Общение": "Conversation",
  "Проницательность": "Human Perception",
  "Допрос": "Interrogation",
  "Убеждение": "Persuasion",
  "Уход за собой": "Personal Grooming",
  "Знание улиц": "Streetwise",
  "Торговля": "Trading",
  "Гардероб и стиль": "Wardrobe & Style",
  "Бухгалтерия": "Accounting",
  "Обращение с животными": "Animal Handling",
  "Бюрократия": "Bureaucracy",
  "Бизнес": "Business",
  "Композиция": "Composition",
  "Криминология": "Criminology",
  "Криптография": "Cryptography",
  "Дедукция": "Deduction",
  "Образование": "Education",
  "Азартные игры": "Gamble",
  "Поиск информации": "Library Search",
  "Знание местности": "Local Expert",
  "Наука": "Science",
  "Тактика": "Tactics",
  "Выживание в пустыне": "Wilderness Survival",
  "Актёрское мастерство": "Acting",
  "Игра на инструментах": "Play Instrument",
  "Стрельба из лука": "Archery",
  "Автоматический огонь (x2)": "Autofire (x2)",
  "Пистолеты": "Handgun",
  "Оружие КР-калибра (x2)": "Heavy Weapons (x2)",
  "Тактическое оружие": "Shoulder Arms",
  "Авиационные технологии": "Air Vehicle Tech",
  "Знания техники": "Basic Tech",
  "Кибертехника": "Cybertech",
  "Подрывник (x2)": "Demolitions (x2)",
  "Электроника/Безопасность (x2)": "Electronics/Security Tech (x2)",
  "Первая помощь": "First Aid",
  "Фальсификация": "Forgery",
  "Автомеханика": "Land Vehicle Tech",
  "Художественное ремесло": "Paint/Draw/Sculpt",
  "Парамедик (x2)": "Paramedic (x2)",
  "Кино и фотография": "Photography/Film",
  "Взлом замков": "Pick Lock",
  "Карманник": "Pick Pocket",
  "Морская технология": "Sea Vehicle Tech",
  "Оружейник": "Weaponstech",
  "Соло": "Solo",
  "Нетраннер": "Netrunner",
  "Техник": "Tech",
  "Медтехник": "Medtech",
  "Медиа": "Media",
  "Рокербой": "Rockerboy",
  "Корпорат": "Exec",
  "Законник": "Lawman",
  "Фиксер": "Fixer",
  "Кочевник": "Nomad",
  "+ АРХИТЕКТУРА": "+ ARCHITECTURE",
  "+ В ОЧЕРЕДЬ": "+ TO QUEUE",
  "+ ВРУЧНУЮ": "+ MANUAL",
  "+ ПРОТИВНИК": "+ ENEMY",
  "+ ТАБЛИЦА": "+ TABLE",
  "0 м": "0 m",
  "1d10: 7 и больше — ответвление, бросок повторяется": "1d10: 7+ — branch, roll again",
  "NPC И ЗАМЕТКИ": "NPCS & NOTES",
  "SP // ТЕКУЩЕЕ / МАКС.": "SP // CURRENT / MAX",
  "SP г/т": "SP h/b",
  "АРЕНДА · ДЕЛА · ХАЛТУРКИ · ОУ · ЦЕНЫ": "RENT · GIGS · SIDE JOBS · IP · PRICES",
  "АРХИТЕКТУРЫ": "ARCHITECTURES",
  "БЕСТИАРИЙ И СЦЕНЫ": "BESTIARY & SCENES",
  "БОЙ: ПРАВИЛА": "COMBAT: RULES",
  "БОЛЬШЕ — РАНЬШЕ": "HIGHER GOES FIRST",
  "Бар «Последний шанс», склад в Уотсоне...": "The Afterlife bar, a warehouse in Watson...",
  "Ближний: SP/2. Мимо брони: яд, газ, огонь. Несмертельный: не ниже 1 ПЗ": "Melee: SP/2. Ignores armor: poison, gas, fire. Non-lethal: not below 1 HP",
  "ВЕРНУТЬ ТАБЛИЦЫ КНИГИ": "RESET BOOK TABLES",
  "ВСЕ В ИНИЦИАТИВУ": "ALL TO INITIATIVE",
  "Взять roleTeam из листов Корпоратов в этом браузере": "Pull roleTeam from Exec sheets in this browser",
  "Вид урона": "Damage type",
  "Все противники одной строкой": "All enemies as single rows",
  "Выберите в карточке дистанцию до цели: «АТАКА» сравнит бросок с DV по таблице книги и при попадании сразу бросит урон. Укрытие и особые условия — в поле DV вручную. Хиты: 10 + 5 × ⌈(ТЕЛ + ВОЛЯ) / 2⌉, если поле «макс.» пустое. Урон минус SP зоны; в голову ×2; холодное оружие — SP/2. Пробитая броня теряет 1 SP. Штрафы ранения, критических травм и захвата лист учитывает в бросках сам; смертельно раненый от каждой атаки получает новую травму. Состояния (огонь, удушье, ток, вакуум) срабатывают по кнопке «Следующий ход» на вкладке «Инициатива».": "Pick range to the target on the card: ATTACK compares the roll to DV from the book table and rolls damage on a hit. Cover and special cases — enter DV manually. HP: 10 + 5 × ⌈(BODY + WILL) / 2⌉ if Max is empty. Damage minus zone SP; head ×2; melee weapons — SP/2. Ablated armor loses 1 SP. Wound, critical injury, and grapple penalties are applied automatically; a Mortally Wounded target takes a new injury from each attack. Conditions (fire, asphyxiation, electricity, vacuum) tick on Next Turn in Initiative.",
  "ГЕНЕРАТОР АРХИТЕКТУРЫ": "ARCHITECTURE GENERATOR",
  "ГЕНЕРАТОРЫ": "GENERATORS",
  "ГРУППОВОЕ ПОПАДАНИЕ": "GROUP HIT",
  "Голова ×2": "Head ×2",
  "ДОБАВИТЬ": "ADD",
  "ДОБЫЧА И НАГРАДЫ": "LOOT & REWARDS",
  "Добавить всех живых противников в инициативу и бросить 1d10 + РЕА": "Add all living enemies to initiative and roll 1d10 + REF",
  "ЕЩЁ ИМЕНА": "MORE NAMES",
  "ЗАГОТОВЛЕННЫЕ СТОЛКНОВЕНИЯ": "PREP ENCOUNTERS",
  "Засада на мосту": "Ambush on the bridge",
  "Зона": "Zone",
  "ИЗМЕНИТЬ ЛОЯЛЬНОСТЬ": "CHANGE LOYALTY",
  "ИМЕНА": "NAMES",
  "ИМПРОВИЗАЦИЯ": "IMPROV",
  "Из бестиария": "From bestiary",
  "Имя игрока или NPC": "Player or NPC name",
  "Иниц.": "Init.",
  "Интерфейс врага": "Enemy Interface",
  "КНИГА ПРАВИЛ 1.25e": "CORE RULEBOOK 1.25e",
  "КОМПАКТНО": "COMPACT",
  "КТО ЕСТЬ КТО": "WHO'S WHO",
  "Как в книге: этажей 3d6, этажи 1–2 — 1d6 по таблице лобби, остальные — 3d6 по таблице сложности; повторяющиеся ЛЁД и Пароли перебрасываются. 1d10 ≥ 7 — ответвление (не раньше второго этажа), самая длинная ветка ведёт к «дну» для Вируса. Несколько ЛЬДОВ на этаже — отдельные строки с одним номером. ⟳ перебрасывает этаж. Кнопка «КАРТИНКА» под таблицей рисует архитектуру для Owlbear.": "As in the book: floors 3d6; floors 1–2 use 1d6 on the lobby table, others 3d6 on the difficulty table; duplicate ICE and Passwords are rerolled. 1d10 ≥ 7 — branch (not before floor 2); the longest branch leads to the “bottom” for Virus. Multiple ICE on a floor are separate rows with one number. ⟳ rerolls a floor. PICTURE under the table draws the architecture for Owlbear.",
  "Как на листе игрока (роль Корпорат, стр. 153–157): найм по таблице типа, лояльность и проверка 1d6. Можно подтянуть команду из листов персонажей в этом браузере.": "Same as the player sheet (Exec role, pp. 153–157): hire from the type table, loyalty and 1d6 check. You can pull a team from character sheets in this browser.",
  "ЛОКАЦИИ": "LOCATIONS",
  "НАКАЗАНИЯ · ТАРО · КАРТЫ · ПОТЫКАТЬ": "PUNISHMENTS · TAROT · CARDS · FIDGET",
  "НАНЯТЬ: БРОСИТЬ СТАТЫ": "HIRE: ROLL STATS",
  "НЕТ ЦЕЛЕЙ": "NO TARGETS",
  "НИКТО НЕ ОТМЕЧЕН": "NONE SELECTED",
  "НОВЫЙ БОЙ": "NEW COMBAT",
  "Название (необязательно)": "Name (optional)",
  "Название архитектуры": "Architecture name",
  "ОТМЕТИТЬ ВСЕХ / СНЯТЬ": "SELECT ALL / CLEAR",
  "ОЧЕРЁДНОСТЬ": "TURN ORDER",
  "ПЕРЕБРОСИТЬ ПРОТИВНИКОВ": "REROLL ENEMIES",
  "ПО ОТМЕЧЕННЫМ": "TO SELECTED",
  "ПО ТАБЛИЦАМ КНИГИ, СТР. 210–211": "BY BOOK TABLES, PP. 210–211",
  "ПОДЧИНЁННЫЕ КОРПОРАТОВ": "EXEC SUBORDINATES",
  "Перебросить 1d10 + РЕА всем противникам": "Reroll 1d10 + REF for all enemies",
  "Перенесите сюда таблицы из книги (Ночной рынок, случайные встречи) или придумайте свои: одна строка — один вариант. Результат попадает в журнал.": "Paste book tables here (Night Market, random encounters) or make your own: one line = one entry. Results go to the log.",
  "Подчинённый": "Subordinate",
  "Подчинённый для события лояльности": "Subordinate for loyalty event",
  "Поиск NPC": "Search NPCs",
  "Поиск по имени, фракции, заметкам...": "Search by name, faction, notes...",
  "Поиск по правилам": "Search rules",
  "Поиск по справочнику": "Search reference",
  "Поиск по справочнику Сети": "Search NET reference",
  "Поиск по справочнику Сети: Адская гончая, Плащ, турель...": "Search NET reference: Hellhound, Cloak, turret...",
  "Поиск: Уклонение, Буст, Когти росомахи, Фиксер...": "Search: Evasion, Boost, Wolvers, Fixer...",
  "Поиск: дробь, укрытие, вакуум, перелом...": "Search: shotgun, cover, vacuum, broken...",
  "Пусто — 3d6": "Empty — 3d6",
  "РАЗВЕРНУТЬ / СВЕРНУТЬ ВСЕ": "EXPAND / COLLAPSE ALL",
  "РАЗВЛЕЧЕНИЯ": "FUN",
  "РАУНД 1": "ROUND 1",
  "РОЛИ · НАВЫКИ · БЕСТИАРИЙ · ИМПЛАНТЫ": "ROLES · SKILLS · BESTIARY · IMPLANTS",
  "Ранг Интерфейса вражеского нетраннера: для бросков программ из справочника": "Enemy Netrunner Interface rank: for program rolls from the reference",
  "Русский": "Russian",
  "СВЕРНУТЬ / РАЗВЕРНУТЬ ВСЕ": "COLLAPSE / EXPAND ALL",
  "СВОИ ТАБЛИЦЫ": "CUSTOM TABLES",
  "СГЕНЕРИРОВАТЬ": "GENERATE",
  "СЕТЬ": "NET",
  "СЛЕДУЮЩИЙ ХОД ▸": "NEXT TURN ▸",
  "СЛУЧАЙНАЯ СТРОКА": "RANDOM ROW",
  "СОРТИРОВАТЬ": "SORT",
  "СОХРАНИТЬ ПОЛЕ КАК СЦЕНУ": "SAVE FIELD AS SCENE",
  "СПИСКИ ЛИСТА, НЕ ИЗ КНИГИ": "SHEET LISTS, NOT FROM THE BOOK",
  "СПРАВОЧНИК": "REFERENCE",
  "СТАТы — 1d6 по таблице типа, лояльность — 1d6 + 1": "STATs — 1d6 by type table, loyalty — 1d6 + 1",
  "СЦЕНЫ": "SCENES",
  "Свернуть или развернуть все карточки": "Collapse or expand all cards",
  "Сложность": "Difficulty",
  "Соберите противника на вкладке «Противники» и нажмите ★ — он сохранится здесь как шаблон. Шаблон с тем же именем заменяется. Из шаблона можно выставить сразу несколько копий: они получат номера.": "Build an enemy on Enemies and press ★ — it is saved here as a template. Same-name templates are replaced. You can spawn several numbered copies from a template.",
  "Соберите противников на поле и сохраните их как сцену: потом она выставляется целиком, со свежими хитами, бронёй и магазинами.": "Assemble enemies on the field and save them as a scene: later spawn the whole set with fresh HP, armor, and magazines.",
  "Событие": "Event",
  "Событие лояльности": "Loyalty event",
  "Состояние": "Condition",
  "ТАБЛИЦЫ ГЕНЕРАТОРА": "GENERATOR TABLES",
  "Таблицы книги, их можно править. Одна строка — один вариант. В таблице из 16 строк бросается 3d6 (первая строка — результат 3, последняя — 18), в другой — равный шанс. Строки: «Пароль СЛ8», «Файл СЛ8», «Узел управления СЛ8», «ЛЁД: Адская гончая», «ЛЁД: Ворон x2», «ЛЁД: Ворон, Аспид», любой другой текст.": "Book tables you can edit. One line = one entry. A 16-line table rolls 3d6 (first line = 3, last = 18); others are equal chance. Lines like: “Password DV8”, “File DV8”, “Control Node DV8”, “ICE: Hellhound”, “ICE: Raven x2”, “ICE: Raven, Asp”, or any other text.",
  "Тип подчинённого": "Subordinate type",
  "УБРАТЬ ПАВШИХ": "REMOVE FALLEN",
  "УЛИКИ И СЕКРЕТЫ": "CLUES & SECRETS",
  "Убрать с поля всех мёртвых": "Remove all dead from the field",
  "Урон: число или формула": "Damage: number or formula",
  "Участник": "Participant",
  "Формула бросается один раз на всех — как граната или взрыв": "The formula is rolled once for everyone — like a grenade or explosion",
  "Чей подчинённый": "Whose subordinate",
  "Что игроки ещё не знают": "What the players don’t know yet",
  "ШАБЛОНОВ НЕТ": "NO TEMPLATES",
  "ЭКОНОМИКА": "ECONOMY",
  "Эдди, снаряжение, очки улучшения (IP)": "Eddies, gear, Improvement Points (IP)",
  "Этажей": "Floors",
  "Эффекты": "Effects",
  "ветвления 1d10": "branches 1d10",
  "урон или 6d6": "damage or 6d6",
  "этажей: 3d6": "floors: 3d6",
  "Language": "Language",
  "English": "English",
  "м": "m",
  "Голова": "Head",
  "Средний пистолет": "Medium Pistol",
  "Тяжёлый пистолет": "Heavy Pistol",
  "Очень тяжёлый пистолет": "Very Heavy Pistol",
  "Пистолет-пулемёт": "SMG",
  "Тяжёлый пистолет-пулемёт": "Heavy SMG",
  "Дробовик": "Shotgun",
  "Штурмовая винтовка": "Assault Rifle",
  "Снайперская винтовка": "Sniper Rifle",
  "Лук / арбалет": "Bow / Crossbow",
  "Гранатомёт": "Grenade Launcher",
  "Ракетомёт": "Rocket Launcher",
  "— свой —": "— custom —",
  "АТАКА": "ATTACK",
  "ЗАЩ": "DEF",
  "ВСП": "JUMP",
  "СВОЙСТВО": "PROPERTY",
  "ПОПАЛ": "HIT",
  "НЕ ПОПАЛ": "MISS",
  "очередь ×2": "autofire ×2",
  "очередь ×3": "autofire ×3",
  "очередь ×4": "autofire ×4",
  "ВКЛ": "ON",
  "ВЫКЛ": "OFF",
  "АКТИВЕН": "ACTIVE",
  "Улучшения (": "Upgrades (",
  "Подтвердите удаление персонажа. Это нельзя отменить.": "Confirm character deletion. This cannot be undone.",
  "Удалить персонажа?": "Delete character?",
  "Лист очищен.": "Sheet cleared.",
  "Импортировано.": "Imported.",
  "Экспортировано.": "Exported.",
  "Очередь": "Autofire",
  "ШТЫК": "BAYONET",
  "1D6": "1D6",
  "Удалено.": "Deleted.",
  "в захвате": "grappled",
  "Стандартные": "Basic",
  "Бронебойные": "Armor-Piercing",
  "Умные": "Smart",
  "С ядом": "Poison",
  "С биотоксином": "Biotoxin",
  "Усыпляющие": "Sleep",
  "ЭМИ": "EMP",
  "Светошумовые": "Flashbang",
  "Дымовые": "Smoke",
  "Слезоточивый газ": "Teargas",
  "Жаканы": "Slugs",
  "Дробь": "Shells",
  "Пули": "Bullets",
  "Стрелы": "Arrows",
  "Гранаты": "Grenades",
  "Ракеты": "Rockets",
  "Личность": "Personality",
  "Жизненные цели": "Life goals",
  "Культурное наследие": "Cultural Heritage",
  "Стиль одежды": "Clothing Style",
  "Прическа": "Hairstyle",
  "Что ты ценишь больше всего?": "What do you value most?",
  "Отношение к людям?": "How do you feel about people?",
  "Самый близкий человек": "Most valued person",
  "Самое ценное, чем ты обладаешь": "Most valued possession",
  "История семьи": "Family background",
  "Среда, в которой прошло детство": "Childhood environment",
  "Семейный кризис": "Family crisis",
  "Трагическая любовь": "Tragic love affair",
  "Образ жизни": "Lifestyle",
  "Арендная плата": "Rent",
  "Жильё": "Housing",
  "Образ и стиль": "Look and style",
  "Псевдоним": "Handle",
  "Например: Бродяга, Средний, Богатый": "e.g. Kibble, Moderate, Wealthy",
  "Ежемесячная плата": "Monthly payment",
  "Тип и описание жилья": "Housing type and description",
  "Внешний вид и стиль": "Appearance and style",
  "ПУЛ СОЗДАНИЯ:": "CREATION POOL:",
  "Минимум 2, максимум 8.": "Minimum 2, maximum 8.",
  "Текущее": "Current",
  "Название": "Name",
  "Стат": "Stat",
  "Урв": "Lvl",
  "Сумм": "Total",
  "НАВЫКИ НЕ НАЙДЕНЫ": "NO SKILLS FOUND",
  "специализация": "specialty",
  "Базовый навык: при создании не ниже 2": "Basic skill: at least 2 during creation",
  "Бросить 1d10 + стат + навык": "Roll 1d10 + STAT + skill",
  "Уровень навыка": "Skill level",
  "Добавить специализацию": "Add specialty",
  "Удалить специализацию": "Remove specialty",
  "Повысить до": "Raise to",
  "за": "for",
  "Штраф брони": "Armor penalty",
  "Штраф ранения": "Wound penalty",
  "ЭМП снижена человечностью до": "EMP reduced by Humanity to",
  "Дальний бой": "Ranged",
  "Ближний бой": "Melee",
  "Навык оружия": "Weapon skill",
  "Тип оружия": "Weapon type",
  "Своё": "Custom",
  "без очереди": "no autofire",
  "Автоматический огонь своего оружия": "Custom weapon autofire",
  "Своя / нет": "Custom / none",
  "— не выбрана —": "— none —",
  "ЛИСТ ОЧИЩЕН": "SHEET CLEARED",
  "Очистить лист текущего персонажа?": "Clear the current character sheet?",
  "Удалить персонажа «": "Delete character “",
  "»?": "”?",
  "Импортирован персонаж «": "Imported character “",
  "БЛОКИ ВКЛАДКИ": "TAB BLOCKS",
  "НЕ СОХРАНЕНО: ПЕРЕПОЛНЕНО ХРАНИЛИЩЕ": "NOT SAVED: STORAGE FULL",
  "СУММА:": "TOTAL:",
  "»": "”",
  "Кожа": "Leather",
  "Кевлар": "Kevlar",
  "Лёгкий армоджек": "Light Armorjack",
  "Бодивейт": "Bodyweight Suit",
  "Средний армоджек": "Medium Armorjack",
  "Тяжёлый армоджек": "Heavy Armorjack",
  "Флак": "Flak",
  "Металгир": "Metalgear",
  "низкое": "Poor",
  "стандартное": "Standard",
  "отличное": "Excellent",
  "урона оружия нет —": "no weapon damage —",
  "Не удалось загрузить изображение.": "Could not load the image.",
  "Не удалось прочитать JSON-файл.": "Could not read the JSON file.",
  "Удача восстановлена:": "Luck restored:",
  "Дартган": "Dartgun"
};

  const EN_STATS = {
  "ИНТ": "INT",
  "РЕА": "REF",
  "ЛВК": "DEX",
  "ТЕХ": "TECH",
  "ХАР": "COOL",
  "ВОЛЯ": "WILL",
  "УДЧ": "LUCK",
  "СКО": "MOVE",
  "ТЕЛ": "BODY",
  "ЭМП": "EMP",
  "ВОЛ": "WILL",
  "РЕФ": "REF"
};

  const EN_STAT_FULL = {
  "Интеллект": "Intelligence",
  "Сила воли": "Willpower",
  "Харизма": "Cool",
  "Эмпатия": "Empathy",
  "Техника": "Technique",
  "Реакция": "Reflexes",
  "Удача": "Luck",
  "Телосложение": "Body",
  "Ловкость": "Dexterity",
  "Скорость": "Movement"
};

  const EN_SKILL_CATEGORIES = {
  "Навыки восприятия": "Awareness Skills",
  "Физические навыки": "Body Skills",
  "Навыки управления": "Control Skills",
  "Навыки ближнего боя": "Fighting Skills",
  "Социальные навыки": "Social Skills",
  "Образовательные навыки": "Education Skills",
  "Сценические навыки": "Performance Skills",
  "Навыки дальнего боя": "Ranged Weapon Skills",
  "Технические навыки": "Technique Skills"
};

  const EN_SKILLS = {
  "Концентрация": "Concentration",
  "Скрытие/раскрытие": "Conceal/Reveal Object",
  "Чтение по губам": "Lip Reading",
  "Внимательность": "Perception",
  "Выслеживание": "Tracking",
  "Атлетика": "Athletics",
  "Акробатика": "Contortionist",
  "Танец": "Dance",
  "Выносливость": "Endurance",
  "Сопрот. пыткам/наркотикам": "Resist Torture/Drugs",
  "Скрытность": "Stealth",
  "Вождение": "Drive Land Vehicle",
  "Пилотирование (x2)": "Pilot Air Vehicle (x2)",
  "Судовождение": "Pilot Sea Vehicle",
  "Верховая езда": "Riding",
  "Рукопашный бой": "Brawling",
  "Уклонение": "Evasion",
  "Боевые искусства (x2)": "Martial Arts (x2)",
  "Оружие ближнего боя": "Melee Weapon",
  "Подкуп": "Bribery",
  "Общение": "Conversation",
  "Проницательность": "Human Perception",
  "Допрос": "Interrogation",
  "Убеждение": "Persuasion",
  "Уход за собой": "Personal Grooming",
  "Знание улиц": "Streetwise",
  "Торговля": "Trading",
  "Гардероб и стиль": "Wardrobe & Style",
  "Бухгалтерия": "Accounting",
  "Обращение с животными": "Animal Handling",
  "Бюрократия": "Bureaucracy",
  "Бизнес": "Business",
  "Композиция": "Composition",
  "Криминология": "Criminology",
  "Криптография": "Cryptography",
  "Дедукция": "Deduction",
  "Образование": "Education",
  "Азартные игры": "Gamble",
  "Язык": "Language",
  "Поиск информации": "Library Search",
  "Знание местности": "Local Expert",
  "Наука": "Science",
  "Тактика": "Tactics",
  "Выживание в пустыне": "Wilderness Survival",
  "Актёрское мастерство": "Acting",
  "Игра на инструментах": "Play Instrument",
  "Стрельба из лука": "Archery",
  "Автоматический огонь (x2)": "Autofire (x2)",
  "Пистолеты": "Handgun",
  "Оружие КР-калибра (x2)": "Heavy Weapons (x2)",
  "Тактическое оружие": "Shoulder Arms",
  "Авиационные технологии": "Air Vehicle Tech",
  "Знания техники": "Basic Tech",
  "Кибертехника": "Cybertech",
  "Подрывник (x2)": "Demolitions (x2)",
  "Электроника/Безопасность (x2)": "Electronics/Security Tech (x2)",
  "Первая помощь": "First Aid",
  "Фальсификация": "Forgery",
  "Автомеханика": "Land Vehicle Tech",
  "Художественное ремесло": "Paint/Draw/Sculpt",
  "Парамедик (x2)": "Paramedic (x2)",
  "Кино и фотография": "Photography/Film",
  "Взлом замков": "Pick Lock",
  "Карманник": "Pick Pocket",
  "Морская технология": "Sea Vehicle Tech",
  "Оружейник": "Weaponstech"
};

  const EN_ROLES = {
  "Соло": "Solo",
  "Нетраннер": "Netrunner",
  "Техник": "Tech",
  "Медтехник": "Medtech",
  "Медиа": "Media",
  "Рокербой": "Rockerboy",
  "Корпорат": "Exec",
  "Законник": "Lawman",
  "Фиксер": "Fixer",
  "Кочевник": "Nomad"
};

  function normalizeLang(value) {
    const v = String(value || '').toLowerCase();
    return SUPPORTED.includes(v) ? v : 'ru';
  }

  function getLang() {
    try { return normalizeLang(localStorage.getItem(LANG_KEY)); }
    catch (_) { return 'ru'; }
  }

  function setLang(lang, { reload = true } = {}) {
    const next = normalizeLang(lang);
    try { localStorage.setItem(LANG_KEY, next); } catch (_) {}
    document.documentElement.lang = next === 'en' ? 'en' : 'ru';
    syncLangButtons();
    if (reload) location.reload();
  }

  function t(ru, en) {
    if (getLang() !== 'en') return ru;
    if (en != null && en !== '') return en;
    if (Object.prototype.hasOwnProperty.call(EN_PHRASES, ru)) return EN_PHRASES[ru];
    return ru;
  }

  // Translate a known game term (stat abbr, skill, role, category, or phrase).
  function term(ru) {
    if (getLang() !== 'en' || ru == null) return ru;
    const key = String(ru);
    return EN_STATS[key] || EN_STAT_FULL[key] || EN_SKILLS[key] || EN_SKILL_CATEGORIES[key]
      || EN_ROLES[key] || EN_PHRASES[key] || key;
  }

  // Map skill/stat labels inside longer UI strings when possible (exact token replace for known terms).
  function termsIn(text) {
    if (getLang() !== 'en' || text == null) return text;
    let out = String(text);
    if (EN_PHRASES[out]) return EN_PHRASES[out];
    // Longer keys first
    const keys = Object.keys(EN_SKILLS).concat(Object.keys(EN_SKILL_CATEGORIES), Object.keys(EN_ROLES), Object.keys(EN_STATS))
      .sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (!key || out.indexOf(key) === -1) continue;
      out = out.split(key).join(term(key));
    }
    return out;
  }

  function localeTag() {
    return getLang() === 'en' ? 'en-US' : 'ru-RU';
  }

  function applyDomI18n(root) {
    const scope = root || document;
    if (getLang() !== 'en') {
      // Restore Russian originals if we had swapped before in this document session.
      scope.querySelectorAll('[data-i18n]').forEach(el => {
        const ru = el.getAttribute('data-i18n');
        if (ru != null) el.textContent = ru;
      });
      ['title', 'placeholder', 'aria-label'].forEach(attr => {
        scope.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
          el.setAttribute(attr, el.getAttribute(`data-i18n-${attr}`));
        });
      });
      if (scope.documentElement) {
        // no-op for fragment
      }
      const titleEl = document.querySelector('title[data-i18n]');
      if (titleEl) titleEl.textContent = titleEl.getAttribute('data-i18n');
      syncLangButtons();
      return;
    }

    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const ru = el.getAttribute('data-i18n');
      if (ru != null) el.textContent = t(ru);
    });
    ['title', 'placeholder', 'aria-label'].forEach(attr => {
      scope.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
        const ru = el.getAttribute(`data-i18n-${attr}`);
        el.setAttribute(attr, t(ru));
      });
    });
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) titleEl.textContent = t(titleEl.getAttribute('data-i18n'));
    syncLangButtons();
  }

  function syncLangButtons() {
    const lang = getLang();
    document.querySelectorAll('[data-set-lang]').forEach(btn => {
      const on = btn.getAttribute('data-set-lang') === lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function bindLangSwitch() {
    document.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('[data-set-lang]');
      if (!btn) return;
      e.preventDefault();
      const next = btn.getAttribute('data-set-lang');
      if (next && next !== getLang()) setLang(next, { reload: true });
    });
  }

  // Patch shared now() after dom.js loads — call from boot.
  function installLocaleAwareNow() {
    if (typeof global.now === 'function') {
      global.now = () => new Date().toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });
    }
  }

  function boot() {
    document.documentElement.lang = getLang() === 'en' ? 'en' : 'ru';
    applyDomI18n(document);
    bindLangSwitch();
    // dom.js may load after this file; install on DOMContentLoaded too.
    installLocaleAwareNow();
    document.addEventListener('DOMContentLoaded', () => {
      applyDomI18n(document);
      installLocaleAwareNow();
      syncLangButtons();
    });
  }

  boot();

  global.I18N = {
    LANG_KEY, getLang, setLang, t, term, termsIn, localeTag, applyDomI18n,
    EN_PHRASES, EN_STATS, EN_SKILLS, EN_SKILL_CATEGORIES, EN_ROLES
  };
  // Short globals used by sheet scripts.
  global.t = t;
  global.term = term;
  global.termsIn = termsIn;
  global.localeTag = localeTag;
})(typeof window !== 'undefined' ? window : globalThis);

