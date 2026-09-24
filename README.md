# vuila9.github.io 🥀

Personal portfolio of **Khoa Xuan Nguyen**, Computer Science graduate (Carleton University) and software developer (wannabe).

### 🌐 Live site: **[vuila9.github.io](https://vuila9.github.io/)**

[![Khoa Xuan Nguyen — Portfolio](assets/img/misc/og-image.jpg)](https://vuila9.github.io/)

The site covers my background, work experience and education, along with a growing collection of projects you can use right in the browser. It's available in **English and Vietnamese** and is built to work on both desktop and mobile.

---

## Projects

| Project | Description | Built with |
| --- | --- | --- |
| [Talk2Me](https://vuila9.github.io/projects/Talk2Me/Talk2Me.html) | A live chat room embedded from its own domain. Message me and I reply in real time from Discord. | Embedded web app ([website4u.vn](https://website4u.vn/)), `postMessage` bridge |
| [Stream Simulator](https://vuila9.github.io/projects/Stream_Simulator/Stream_Simulator.html) | A streaming simulator that lets you role-play as a streamer with any audience size. | HTML, CSS, JavaScript |
| [Snake Game](https://vuila9.github.io/projects/Snake/Snake.html) | The classic Snake game, with touch controls for mobile. | HTML, CSS, JavaScript |
| [Games](https://vuila9.github.io/projects/Games/Games.html) | A small collection of classic games recreated for the browser: | |
| ↳ [Bejeweled X](https://vuila9.github.io/projects/BejeweledX/BejeweledX.html) | A web revival of the match-3 classic Bejeweled 2, using the original assets. Installable as an app. | JavaScript, PWA |
| ↳ [Flappy Bird](https://vuila9.github.io/projects/Flappy_Bird/Flappy_Bird.html) | A web revival of Flappy Bird using the original 2014 assets. Installable as an app. | JavaScript, PWA |
| ↳ [Achilles](https://vuila9.github.io/projects/Achilles/Achilles.html) | The 2008 Flash brawler, running unmodified through an emulator, with touch controls added. | [Ruffle](https://ruffle.rs/), PWA |
| [Paint](https://vuila9.github.io/projects/MS_Paint/MS_Paint.html) | A paint program in the style of MS Paint. | JavaScript, html2canvas |
| [Cube](https://vuila9.github.io/projects/Cube/Cube.html) | An interactive 3D object rendered in the browser. | Three.js, Blender |
| [Terminal Simulator](https://vuila9.github.io/projects/CMD_Terminal_Simulator/CMD_Terminal_Simulator.html) | A simulator for the Windows CMD and Ubuntu Terminal command consoles. | HTML, CSS, JavaScript |
| [Many mini-tools](https://vuila9.github.io/projects/Many_mini-tools/Many_mini-tools.html) | Small tools: timer, stopwatch, text encrypt/decrypt, regex comparison, mic and webcam testers, and more. | JavaScript, Web Media APIs |
| [Sudoku Game (v2)](https://vuila9.github.io/projects/Sudoku_JS/Sudoku_JS.html) | A Sudoku game with a built-in solver and a full GUI. | HTML, CSS, JavaScript |
| [Sudoku Solver](https://vuila9.github.io/projects/Sudoku_Solver/Sudoku_Solver.html) | The original Python version of the Sudoku solver ([source](https://github.com/vuila9/Sudoku-Solver)). | Python |
| [Web-based Restaurant](https://vuila9.github.io/projects/Web-based_Restaurant/Web-based_Restaurant.html) | An online restaurant with a stored order database ([source](https://github.com/vuila9/Web-Design-with-Nodejs)). | Node.js, MongoDB |
| [Store Application](https://vuila9.github.io/projects/Store_Application/Store_Application.html) | A desktop store application with a graphical user interface ([source](https://github.com/vuila9/Store-Application)). | Java |

> **A note on AI:** some projects were hand-coded and some were built or updated with AI. See [AI Usage](#ai-usage) for details on each one.

---

## AI Usage

I wrote every project up to and including Stream Simulator by hand, with no AI assistance. Since then I've used AI-assisted coding, both for new projects and for updating older ones. I still apply my own coding knowledge and fundamentals wherever they're needed. Here's where each project stands:

**Built with AI assistance from the start**
- Talk2Me, the Games hub, Bejeweled X, Flappy Bird, Achilles and the Stat page
- Site-wide additions: the mobile tile previews, SEO and analytics

**Originally hand-coded, later updated with AI assistance**

| Project | What AI helped with |
| --- | --- |
| Stream Simulator | Layout that adapts to screen size and zoom level, mobile version |
| Snake Game | Mobile support: touch controls and button layout |
| Paint | Mobile experience and new drawing features |
| Terminal Simulator | Bug fixes and a cleanup of the command-handling code |
| Sudoku Game (v2) | Mobile layout and bug fixes |

**Hand-coded, no AI changes to the project itself**
- The homepage: its overall layout and all its sections
- Cube, Many mini-tools, Sudoku Solver, Web-based Restaurant, Store Application

  AI only helped with small site-wide edits to these pages, such as the analytics tag and shared page scripts.

---

## Tech Stack

**The site itself**
- **HTML5, CSS3 / Sass, vanilla JavaScript.** No framework and no build step. jQuery is included through the template.
- **[HTML5 UP Phantom](https://html5up.net/phantom)** template as the base layout.
- **Custom i18n system** with an English / Vietnamese toggle that remembers your choice.
- **GitHub Pages** hosting, deployed automatically with GitHub Actions.
- **Google Analytics 4** through Google Tag Manager. You can see the live results on the [Stat page](https://vuila9.github.io/stat/), a public dashboard of the site's own GA4 traffic data.
- SEO basics: Open Graph / Twitter cards, JSON-LD structured data, `sitemap.xml` and `robots.txt`.

**Used in individual projects**
- **Three.js** + **Blender** (Cube)
- **Ruffle** Flash emulator (Achilles)
- **Service workers + web app manifests** for offline-capable, installable games (Bejeweled X, Flappy Bird, Achilles)
- **html2canvas** (Paint)
- **Node.js + MongoDB** (Web-based Restaurant), **Java** (Store Application), **Python** (Sudoku Solver)

---

## Site Map

```
vuila9.github.io/
├── /                                   Home: projects, about me, experience, contact
├── stat/                               Live GA4 analytics dashboard for this site
└── projects/
    ├── Talk2Me/Talk2Me.html
    ├── Stream_Simulator/Stream_Simulator.html
    ├── Snake/Snake.html
    ├── Games/Games.html                Games hub
    ├── BejeweledX/
    │   ├── BejeweledX.html             Project page
    │   └── webapp.html                 Standalone / installable app
    ├── Flappy_Bird/
    │   ├── Flappy_Bird.html
    │   └── webapp.html
    ├── Achilles/
    │   ├── Achilles.html
    │   └── webapp.html
    ├── MS_Paint/MS_Paint.html
    ├── Cube/Cube.html
    ├── CMD_Terminal_Simulator/CMD_Terminal_Simulator.html
    ├── Many_mini-tools/Many_mini-tools.html
    ├── Sudoku_JS/Sudoku_JS.html
    ├── Sudoku_Solver/Sudoku_Solver.html
    ├── Web-based_Restaurant/Web-based_Restaurant.html
    └── Store_Application/Store_Application.html
```

**Where things live in the repo**
- `index.html`: the main portfolio page
- `projects/`: one self-contained folder per project, each with its own page, icon and `assets/` (CSS, JS, images)
- `assets/`: shared site files: `css/`, `sass/`, `js/` (including the tile renderer and translations), `img/`, `webfonts/` and `attachment/` (resume)

---

## Contact

- 💼 LinkedIn: [linkedin.com/in/jxnguyen](https://www.linkedin.com/in/jxnguyen/)
- ✉️ Email: [johnxnguyenwork@gmail.com](mailto:johnxnguyenwork@gmail.com)
- 📄 Resume: [John_Resume.pdf](assets/attachment/John_Resume.pdf)

---

## Credits & License

- Site design is based on **[Phantom by HTML5 UP](https://html5up.net/phantom)**, licensed under [Creative Commons Attribution 3.0](https://html5up.net/license).
- Achilles runs on **[Ruffle](https://ruffle.rs/)**. Bejeweled X, Flappy Bird and Achilles are fan revivals; the original games and their assets belong to their respective owners.
- My own code in this repository is released under the [MIT License](LICENSE).
