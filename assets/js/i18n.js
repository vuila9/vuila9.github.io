// ============================================================================
// i18n.js — Lightweight bilingual (English / Vietnamese) locale system
// ----------------------------------------------------------------------------
// How it works:
//   - Any element with a data-i18n="some.key" attribute gets its text content
//     replaced by the matching string from the `translations` dictionary.
//   - For attributes (e.g. alt, title, placeholder), use
//     data-i18n-attr="attrName:some.key" (multiple allowed, comma-separated).
//   - Elements needing raw HTML (links inside text) use data-i18n-html instead
//     of data-i18n.
//   - The chosen language is stored in localStorage under LANG_KEY so it
//     persists across pages and reloads.
//
// Adding a new page/project:
//   - Reuse this same file. Add a new namespace to `translations.en` /
//     `translations.vi`, tag the markup with data-i18n keys, and include this
//     script.
// ============================================================================

const LANG_KEY = "site_lang";
const DEFAULT_LANG = "en";
const SUPPORTED_LANGS = ["en", "vi"];

// ----------------------------------------------------------------------------
// Translation dictionary
// Keep keys grouped by page/section. `en` is the source of truth; `vi` mirrors
// its structure. Use dot notation in data-i18n (e.g. "home.welcome").
// ----------------------------------------------------------------------------
const translations = {
    en: {
        // --- Header / intro ---
        "home.logoTitle": "My name is Khoa Xuan Nguyen",
        "home.welcome": "Welcome to my portfolio!",
        "home.intro1": "This website provides an overview of my background and showcases all the projects I have created. Unless otherwise specified, most of these projects were developed using vanilla JavaScript, without the use of any frameworks or library.",
        "home.intro2": "It has been a while since I last posted a project. I recently moved back to Vietnam for more opportunities and am currently working as a developer at a small-sized company. I’ve been handling various projects and tasks, and I’m actively working on them. I’ll be sharing updates soon.",
        "home.intro3": "All of my projects up to Streaming Simulator were completely hand-coded without any AI assistance. However, I’ve come to realize that avoiding AI entirely would be like handicapping myself. So from this point onward, many of my upcoming and future projects will heavily involve AI-assisted coding. Of course, my coding knowledge and fundamentals will still be applied wherever necessary and won’t go to waste.",

        // --- Navigation / menu ---
        "nav.menu": "Menu",
        "nav.home": "Home",
        "nav.projects": "Projects",
        "nav.about": "About Me",
        "nav.experience": "Experience",
        "nav.contact": "Contact",

        // --- Section headings ---
        "section.projects": "PROJECTS",
        "section.about": "ABOUT ME",
        "section.experience": "EXPERIENCE",

        // --- About Me (command prompt) ---
        "about.whoami1": "It all started with a passion for computer science because I love coding. While I initially enjoyed math and physics, I found them too dry to pursue professionally. My interest in coding began in high school when I was unsure about which course to study. As I explored coding further, my love for it grew. Eventually, I realized that being good at math actually complements computer science, and I finally discovered my career path.",
        "about.whoami2": "My diligent efforts during university were rewarded when I secured an internship at BlackBerry QNX. During my time there, I gained invaluable insights into the realities of a professional environment, particularly in software development and engineering roles. Additionally, I had the opportunity to engage in various social aspects, including team meetings, discussions, and assuming responsibilities. The knowledge and experiences I acquired during this internship were beyond the scope of classroom learning.",
        "about.whoami3": "After the internship, I returned to complete my university studies at Carleton. Although the job search turned out to be more challenging than I anticipated, I made the decision to regroup and invest in my personal growth. After reassessing my situation, I recognized that my lack of experience was a significant factor. Consequently, I have concentrated on enhancing my professional skills by creating numerous small to medium-sized projects.",
        "about.whoami4": "I traveled to Canada in June 2017 to study abroad. Started in Grade 11 at Glebe CI, Ottawa. I then went to Carleton University for 4.5 years of study. Lived and worked for another 2 years. February 2026, my journey here finally concluded, and I decided it was a good time to go home, in Vietnam.",
        
        "about.reachEmail": "You can reach out to me at my working email address: ",
        "about.moreBottom": "More can be found at the <a class=\"cmd-log\" style=\"color: cyan\" href=\"#footer\">bottom</a> of this website ↓",
        "about.resumeBtn": "Download My Resume!",

        // --- Experience: skills cards ---
        "exp.languages": "Languages",
        "exp.tools": "Tools",
        "exp.coursework": "Coursework & Interests",
        "exp.tools.li1": "Git, Pytest, GDB/PDB, CVAT, YOLO",
        "exp.tools.li2": "Linux, Windows, Oracle VM VirtualBox",
        "exp.tools.li3": "Frameworks: React 19, Next.js, Astro, Node.js",
        "exp.tools.li4": "Libraries: Tailwind CSS, Qt, PyQt, Tkinter, Konva",
        "exp.tools.li5": "Database & CMS: SQLite, Sanity CMS",
        "exp.course.li1": "Algorithms, Discrete Structures",
        "exp.course.li2": "Object-Oriented Design",
        "exp.course.li3": "Cybersecurity, AI",
        "exp.course.li4": "Web Applications",
        "exp.course.li5": "Systems Programming, Distributed OS",

        // --- Experience: co-op ---
        "exp.coop.role": "Command Line Tools Co-op",
        "exp.coop.company": "BlackBerry QNX",
        "exp.coop.date": "May 2022 - Dec 2022",
        "exp.coop.li1": "Focused on Linux OS, Bash scripting, Python scripting, and C programming",
        "exp.coop.li2": "Tested compatibility of over 300 GNU commands and their flags in BlackBerry's QNX OS",
        "exp.coop.li3": "Enhanced and added five features to front-end and back-end of software usage tracking tool using HTML, Python, JavaScript scripting as base code",
        "exp.coop.li4": "Conducted extensive Python automation scripting, utilizing Pytest to automatically check status of over 40 QNX targets using the Paramiko SSH library",
        "exp.coop.li5": "Performed bug testing on 40 'verification' JIRA tickets to ensure bug fixes work correctly",
        "exp.coop.li6": "Responsible for resolving over 20 JIRA bug tickets submitted by other testers and BlackBerry's customers, utilizing advanced debugging tools such as GDB and PDB",
        "exp.coop.li7": "Developed Python log parser to extract and convert data from over 250,000 test logs on internal report server database into easily readable format",

        // --- Experience: collapsible note hint ---
        "exp.clickHint": "Click to read more",

        // --- Experience: freelance — Electrical Cabinet Configurator (MG) ---
        "exp.mg.role": "Web-Based Electrical Cabinet Configurator",
        "exp.mg.company": "Freelance Project",
        "exp.mg.date": "June 2026 - Present",
        "exp.mg.li1": "Building a full-featured web application that lets users design electrical cabinets by selecting from a catalog of pre-built components, each with detailed specifications and high-resolution imagery",
        "exp.mg.li2": "Implemented an interactive canvas using Konva where users place, drag, and arrange components in real time with millimeter-accurate, real-world measurements and overlap validation",
        "exp.mg.li3": "Designed an extensive, searchable device library backed by structured component data, allowing users to filter and compare parts before adding them to a configuration",
        "exp.mg.li4": "Standardized the entire cabinet-design workflow to auto-generate consistent output documents — assembly diagrams, parts lists, and quotes — for every project",
        "exp.mg.li5": "Focused on a responsive, intuitive interface so both technical and non-technical users can build valid cabinet layouts without training",
        "exp.mg.li6": "Tools & Frameworks: React 19 + TypeScript (strict mode), Konva (interactive canvas), Vite, and Cloudflare Workers",

        // --- Experience: freelance — B2B M&E Solutions Website (GP) ---
        "exp.gp.role": "B2B M&E Solutions Website",
        "exp.gp.company": "Freelance Project",
        "exp.gp.date": "June 2026 - Present",
        "exp.gp.li1": "Designed and built a modern, minimalist corporate website for a B2B mechanical & electrical (M&E) solutions company, with clean typography, generous whitespace, and refined micro-interactions",
        "exp.gp.li2": "Integrated a headless CMS (Sanity) so non-technical editors can independently create and publish content — projects, news, products, and pages — with zero developer involvement",
        "exp.gp.li3": "Engineered strong SEO and AIO foundations (canonical tags, structured metadata, semantic markup), passing rigorous performance and accessibility audits with high Lighthouse and PageSpeed Insights scores",
        "exp.gp.li4": "Implemented an email inquiry handler using Resend so leads submitted through the site are delivered reliably to the client's inbox",
        "exp.gp.li5": "Delivered a smooth, polished browsing experience that stays consistent across desktop, tablet, and mobile devices",
        "exp.gp.li6": "Tools & Frameworks: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Sanity CMS, Cloudflare Workers, Resend (email inquiry handler), and Google Analytics 4",

        // --- Experience: education ---
        "exp.edu.heading": "Education",
        "exp.edu.school": "Carleton University",
        "exp.edu.degree": "Bachelor in Computer Science (Honours)",
        "exp.edu.date": "Sept 2019 - May 2024",
        "exp.edu.li1": "Achieved average of A on major CompSci courses",
        "exp.edu.li2": "Participated in various social events and group projects",
        "exp.edu.li3": "Other relatable courses: Statistic, Mathematics, Business",

        // --- Experience: personal skills ---
        "exp.personal.heading": "Personal skills",
        "exp.personal.li1": "Computer hardware assembly",
        "exp.personal.li2": "Computer software troubleshooting",
        "exp.personal.li3html": "All the projects at the <a href=\"#main\">top</a> ↑",
        "exp.personal.li4": "Hard-working, ethical, opportunistic",
        "exp.personal.li5": "Fluent in English, Vietnamese",

        // --- Footer / contact ---
        "footer.contact": "Contact",
        "footer.location": "&nbsp;&nbsp;&nbsp;&nbsp;Ho Chi Minh, Vietnam",
        "footer.aboutSite": "About Site",
        "footer.aboutSiteText": "This is my personal portfolio, built using a free template from ",
        "footer.connect": "Connect",
        "footer.copyright": "Copyright © Khoa X Nguyen 2024-2026",

        // --- Project tiles (rendered by homepage_script.js) ---
        "proj.games.title": "Games",
        "proj.games.desc": "A small collection of classic games recreated for the browser.",
        "proj.bejeweled.title": "Bejeweled X",
        "proj.bejeweled.desc": "A web revival of the classic match-3 game Bejeweled 2, using the original assets and re-implemented in vanilla JavaScript.",
        "proj.flappy.title": "Flappy Bird",
        "proj.flappy.desc": "A web revival of the classic Flappy Bird, using the original 2014 assets and re-implemented in vanilla JavaScript.",
        "proj.achilles.title": "Achilles",
        "proj.achilles.desc": "The 2008 Flash brawler Achilles, running unmodified through the Ruffle emulator with touch controls added.",
        "proj.stream.title": "Stream Simulator",
        "proj.stream.desc": "A streaming simulator that lets you role-play as a streamer with any audience size.",
        "proj.snake.title": "Snake Game",
        "proj.snake.desc": "Snake game made using HTML, CSS, JS",
        "proj.paint.title": "Paint",
        "proj.paint.desc": "A paint program that allows users to draw.",
        "proj.cube.title": "Cube",
        "proj.cube.desc": "A program featuring a 3D object created using Three.js and Blender.",
        "proj.terminal.title": "Terminal Simulator",
        "proj.terminal.desc": "A simulator for Windows CMD and Ubuntu Terminal command consoles.",
        "proj.manytools.title": "Many mini-tools",
        "proj.manytools.desc": "A collection of small-scale projects (or tools) that I find interesting to implement or useful for personal need.",
        "proj.sudoku.title": "Sudoku Game (v2)",
        "proj.sudoku.desc": "A Sudoku game with built-in solver, featuring a fully implemented GUI using JavaScript, HTML, and CSS.",
        "proj.restaurant.title": "Web-based Restaurant",
        "proj.restaurant.desc": "A web-based online restaurant using MongoDB for storing order database and Node.js for server hosting.",
        "proj.store.title": "Store Application",
        "proj.store.desc": "A Java-based application with a graphical user interface (GUI).",

        // --- Language toggle ---
        "toggle.label": "Tiếng Việt",
    },
    vi: {
        // --- Header / intro ---
        "home.logoTitle": "Tôi tên là Nguyễn Xuân Khoa",
        "home.welcome": "Chào mừng đến với portfolio của tôi!",
        "home.intro1": "Trang web này giới thiệu tổng quan về bản thân tôi và trưng bày tất cả các dự án tôi đã thực hiện. Trừ khi có ghi chú khác, phần lớn các dự án này được phát triển bằng JavaScript gốc, không sử dụng bất kỳ framework hay thư viện nào.",
        "home.intro2": "Đã một thời gian kể từ lần cuối tôi đăng một dự án. Gần đây tôi đã chuyển về Việt Nam để tìm kiếm nhiều cơ hội hơn và hiện đang làm lập trình viên tại một công ty quy mô nhỏ. Tôi đã và đang đảm nhận nhiều dự án cũng như công việc khác nhau và đang tích cực thực hiện chúng. Tôi sẽ sớm chia sẻ những cập nhật mới.",
        "home.intro3": "Tất cả các dự án của tôi tính đến Streaming Simulator đều được viết tay hoàn toàn mà không có sự hỗ trợ của AI. Tuy nhiên, tôi nhận ra rằng việc né tránh AI hoàn toàn chẳng khác nào tự trói tay mình. Vì vậy, kể từ đây, nhiều dự án sắp tới và trong tương lai của tôi sẽ có sự tham gia đáng kể của việc lập trình với sự hỗ trợ của AI. Tất nhiên, kiến thức và nền tảng lập trình của tôi vẫn sẽ được áp dụng ở bất cứ nơi nào cần thiết và sẽ không bị lãng phí.",

        // --- Navigation / menu ---
        "nav.menu": "Menu",
        "nav.home": "Trang chủ",
        "nav.projects": "Dự án",
        "nav.about": "Về tôi",
        "nav.experience": "Kinh nghiệm",
        "nav.contact": "Liên hệ",

        // --- Section headings ---
        "section.projects": "PROJECTS",
        "section.about": "VỀ TÔI",
        "section.experience": "EXPERIENCE",

        // --- About Me (command prompt) ---
        "about.whoami1": "Tôi có niềm đam mê với khoa học máy tính vì tôi yêu thích lập trình. Ban đầu tôi thích toán và vật lý, nhưng tôi thấy chúng quá khô khan để theo đuổi chuyên nghiệp. Niềm hứng thú với lập trình của tôi bắt đầu từ thời trung học khi tôi còn phân vân không biết nên học ngành gì. Càng tìm hiểu về lập trình, tình yêu của tôi dành cho nó càng lớn. Cuối cùng, tôi nhận ra rằng giỏi toán thực ra lại bổ trợ cho khoa học máy tính, và tôi đã tìm ra con đường sự nghiệp của mình.",
        "about.whoami2": "Những nỗ lực chăm chỉ trong thời đại học của tôi đã được đền đáp khi tôi giành được một suất thực tập tại BlackBerry QNX. Trong thời gian ở đó, tôi đã thu được những hiểu biết vô giá về thực tế của môi trường chuyên nghiệp, đặc biệt là trong các vai trò phát triển và kỹ thuật phần mềm. Ngoài ra, tôi còn có cơ hội tham gia vào nhiều khía cạnh xã hội khác nhau, bao gồm các cuộc họp nhóm, thảo luận và đảm nhận trách nhiệm. Kiến thức và kinh nghiệm tôi tích lũy được trong kỳ thực tập này vượt xa những gì học được trên lớp.",
        "about.whoami3": "Sau kỳ thực tập, tôi quay lại hoàn thành việc học đại học tại Carleton. Mặc dù quá trình tìm việc hóa ra khó khăn hơn tôi dự đoán, tôi đã quyết định chấn chỉnh lại và đầu tư vào sự phát triển bản thân. Sau khi đánh giá lại tình hình, tôi nhận ra rằng việc thiếu kinh nghiệm là một yếu tố quan trọng. Do đó, tôi đã tập trung nâng cao kỹ năng chuyên môn bằng cách tạo ra nhiều dự án quy mô từ nhỏ đến trung bình.",
        "about.reachEmail": "Bạn có thể liên hệ với tôi qua địa chỉ email công việc: ",
        "about.moreBottom": "Có thể tìm thêm thông tin ở <a class=\"cmd-log\" style=\"color: cyan\" href=\"#footer\">cuối</a> trang web này ↓",
        "about.resumeBtn": "Tải CV của tôi!",

        // --- Experience: skills cards ---
        "exp.languages": "Ngôn ngữ lập trình",
        "exp.tools": "Công cụ",
        "exp.coursework": "Môn học & Sở thích",
        "exp.tools.li1": "Git, Pytest, GDB/PDB, CVAT, YOLO",
        "exp.tools.li2": "Linux, Windows, Oracle VM VirtualBox",
        "exp.tools.li3": "Framework: React 19, Next.js, Astro, Node.js",
        "exp.tools.li4": "Thư viện: Tailwind CSS, Qt, PyQt, Tkinter, Konva",
        "exp.tools.li5": "Cơ sở dữ liệu & CMS: SQLite, Sanity CMS",
        "exp.course.li1": "Thuật toán, Cấu trúc rời rạc",
        "exp.course.li2": "Thiết kế hướng đối tượng",
        "exp.course.li3": "An ninh mạng, AI",
        "exp.course.li4": "Ứng dụng web",
        "exp.course.li5": "Lập trình hệ thống, Hệ điều hành phân tán",

        // --- Experience: co-op ---
        "exp.coop.role": "Thực tập Công cụ Dòng lệnh",
        "exp.coop.company": "BlackBerry QNX",
        "exp.coop.date": "Tháng 5 2022 - Tháng 12 2022",
        "exp.coop.li1": "Tập trung vào hệ điều hành Linux, viết script Bash, script Python và lập trình C",
        "exp.coop.li2": "Kiểm thử tính tương thích của hơn 300 lệnh GNU và các cờ của chúng trên hệ điều hành QNX của BlackBerry",
        "exp.coop.li3": "Cải tiến và bổ sung năm tính năng cho front-end và back-end của công cụ theo dõi mức sử dụng phần mềm, dùng HTML, Python, JavaScript làm mã nền",
        "exp.coop.li4": "Thực hiện viết script tự động hóa Python quy mô lớn, sử dụng Pytest để tự động kiểm tra trạng thái của hơn 40 target QNX bằng thư viện Paramiko SSH",
        "exp.coop.li5": "Thực hiện kiểm thử lỗi trên 40 ticket JIRA 'xác minh' để đảm bảo các bản vá lỗi hoạt động chính xác",
        "exp.coop.li6": "Chịu trách nhiệm xử lý hơn 20 ticket lỗi JIRA do các tester khác và khách hàng của BlackBerry gửi, sử dụng các công cụ gỡ lỗi nâng cao như GDB và PDB",
        "exp.coop.li7": "Phát triển bộ phân tích log bằng Python để trích xuất và chuyển đổi dữ liệu từ hơn 250.000 log kiểm thử trên cơ sở dữ liệu máy chủ báo cáo nội bộ sang định dạng dễ đọc",

        // --- Experience: education ---
        "exp.edu.heading": "Học vấn",
        "exp.edu.school": "Đại học Carleton",
        "exp.edu.degree": "Cử nhân Khoa học Máy tính (Honours)",
        "exp.edu.date": "Tháng 9 2019 - Tháng 5 2024",
        "exp.edu.li1": "Đạt điểm trung bình A ở các môn Khoa học Máy tính chính",
        "exp.edu.li2": "Tham gia nhiều sự kiện xã hội và dự án nhóm",
        "exp.edu.li3": "Các môn liên quan khác: Thống kê, Toán học, Kinh doanh",

        // --- Experience: personal skills ---
        "exp.personal.heading": "Kỹ năng cá nhân",
        "exp.personal.li1": "Lắp ráp phần cứng máy tính",
        "exp.personal.li2": "Xử lý sự cố phần mềm máy tính",
        "exp.personal.li3html": "Tất cả các dự án ở <a href=\"#main\">phía trên</a> ↑",
        "exp.personal.li4": "Chăm chỉ, có đạo đức, biết nắm bắt cơ hội",
        "exp.personal.li5": "Thông thạo tiếng Anh, tiếng Việt",

        // --- Footer / contact ---
        "footer.contact": "Liên hệ",
        "footer.location": "&nbsp;&nbsp;&nbsp;&nbsp;Thành phố Hồ Chí Minh, Việt Nam",
        "footer.aboutSite": "Về trang web",
        "footer.aboutSiteText": "Đây là portfolio cá nhân của tôi, được xây dựng bằng một template miễn phí từ ",
        "footer.connect": "Kết nối",
        "footer.copyright": "Bản quyền © Khoa X Nguyen 2024-2026",

        // --- Project tiles (rendered by homepage_script.js) ---
        "proj.games.title": "Trò chơi",
        "proj.games.desc": "Một bộ sưu tập nhỏ các trò chơi kinh điển được tái hiện lại trên trình duyệt.",
        "proj.bejeweled.title": "Bejeweled X",
        "proj.bejeweled.desc": "Phiên bản web hồi sinh của trò chơi match-3 kinh điển Bejeweled 2, sử dụng tài nguyên gốc và được viết lại bằng vanilla JavaScript.",
        "proj.flappy.title": "Flappy Bird",
        "proj.flappy.desc": "Phiên bản web hồi sinh của trò Flappy Bird kinh điển, sử dụng tài nguyên gốc năm 2014 và được viết lại bằng vanilla JavaScript.",
        "proj.achilles.title": "Achilles",
        "proj.achilles.desc": "Trò đánh đấm Flash năm 2008 Achilles, chạy nguyên bản qua trình giả lập Ruffle với điều khiển cảm ứng được thêm vào.",
        "proj.stream.title": "Stream Simulator",
        "proj.stream.desc": "Trình mô phỏng streaming cho phép bạn nhập vai một streamer với lượng khán giả bất kỳ.",
        "proj.snake.title": "Snake Game",
        "proj.snake.desc": "Trò chơi Rắn săn mồi làm bằng HTML, CSS, JS",
        "proj.paint.title": "Paint",
        "proj.paint.desc": "Một chương trình vẽ cho phép người dùng vẽ tranh.",
        "proj.cube.title": "Cube",
        "proj.cube.desc": "Chương trình giới thiệu một vật thể 3D được tạo bằng Three.js và Blender.",
        "proj.terminal.title": "Terminal Simulator",
        "proj.terminal.desc": "Trình mô phỏng console dòng lệnh Windows CMD và Ubuntu Terminal.",
        "proj.manytools.title": "Many mini-tools",
        "proj.manytools.desc": "Một tập hợp các dự án (hoặc công cụ) quy mô nhỏ mà tôi thấy thú vị để triển khai hoặc hữu ích cho nhu cầu cá nhân.",
        "proj.sudoku.title": "Sudoku Game (v2)",
        "proj.sudoku.desc": "Trò chơi Sudoku với bộ giải tích hợp, có giao diện GUI được triển khai đầy đủ bằng JavaScript, HTML và CSS.",
        "proj.restaurant.title": "Web-based Restaurant",
        "proj.restaurant.desc": "Một nhà hàng trực tuyến trên web sử dụng MongoDB để lưu cơ sở dữ liệu đơn hàng và Node.js để lưu trữ máy chủ.",
        "proj.store.title": "Store Application",
        "proj.store.desc": "Một ứng dụng bằng Java với giao diện đồ họa người dùng (GUI).",

        // --- Language toggle ---
        "toggle.label": "English",
    },
};

// Expose the dictionary so other scripts (e.g. homepage_script.js) can read it.
window.i18n = window.i18n || {};
window.i18n.translations = translations;

// ----------------------------------------------------------------------------
// Core helpers
// ----------------------------------------------------------------------------
function getLang() {
    const stored = localStorage.getItem(LANG_KEY);
    return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
}

function t(key, lang = getLang()) {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    // Fall back to English, then to the raw key if a string is missing.
    return dict[key] ?? translations[DEFAULT_LANG][key] ?? key;
}

// Apply all translations for the current language to the DOM.
function applyTranslations(lang = getLang()) {
    // Plain text nodes.
    document.querySelectorAll("[data-i18n]").forEach(el => {
        el.textContent = t(el.getAttribute("data-i18n"), lang);
    });

    // Rich text (contains inline HTML like links).
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        el.innerHTML = t(el.getAttribute("data-i18n-html"), lang);
    });

    // Attribute translations: data-i18n-attr="alt:key1,title:key2"
    document.querySelectorAll("[data-i18n-attr]").forEach(el => {
        el.getAttribute("data-i18n-attr").split(",").forEach(pair => {
            const [attr, key] = pair.split(":").map(s => s.trim());
            if (attr && key) el.setAttribute(attr, t(key, lang));
        });
    });

    // Update <html lang> and the toggle button. CSS keys off data-lang to show
    // the flag of the OTHER language; the title/aria give an accessible label.
    document.documentElement.setAttribute("lang", lang);
    const toggle = document.getElementById("lang-toggle");
    if (toggle) {
        toggle.setAttribute("data-lang", lang);
        toggle.setAttribute("title", t("toggle.label", lang));
        toggle.setAttribute("aria-label", t("toggle.label", lang));
    }

    // Let dynamic renderers (project tiles, etc.) re-render in the new language.
    document.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}

function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
}

function toggleLang() {
    setLang(getLang() === "en" ? "vi" : "en");
}

// Expose for other scripts.
window.i18n.t = t;
window.i18n.getLang = getLang;
window.i18n.setLang = setLang;
window.i18n.applyTranslations = applyTranslations;

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("lang-toggle");
    if (toggle) toggle.addEventListener("click", toggleLang);
    applyTranslations();
});
