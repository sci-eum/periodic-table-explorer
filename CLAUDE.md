# 주기율표 탐험실 — 프로젝트 지침

## 목표
- `index.html`: 학생용 인터랙티브 주기율표(분류·온도·성질·발견·퀴즈).
- `wallpaper.html`: 교사 PC 바탕화면용 움직이는 주기율표. Lively Wallpaper에 웹 주소로 넣어 쓴다.
  - 원소 스포트라이트(보어 모형·이야기)가 `speed`초마다, 보기(분류→온도→성질→발견)가 `view`초마다 바뀐다.
  - 클릭 없이 보기만 하는 화면. 어두운 배경, 16:9 모니터 1대 기준(1600×900 무대를 화면에 맞춰 확대).
  - 왼쪽 130px은 바탕화면 아이콘, 아래 70px은 작업 표시줄 자리로 비운다.

## 제약
- 빌드 없음, 서버 없음, DB 없음. 정적 파일만 쓴다. `index.html`·`wallpaper.html`은 더블클릭으로도 열려야 한다.
- 원소 자료는 `js/data.js`, 공용 계산·`PROPS`·`MILESTONES`는 `js/core.js`에 둔다. 두 페이지가 함께 쓴다.

## 검증 기준
- 로컬: `.claude/launch.json`의 `periodic-table`(python http.server 8765)로 열어 콘솔 오류 0건.
- `wallpaper.html?view=20&speed=6`으로 네 가지 보기 전환과 스포트라이트 교체를 확인한다.
- `index.html`의 성질·발견 탭이 계속 동작하는지 확인한다(공용 자료를 옮겼기 때문).
- 배포 후 `/`, `/wallpaper.html`이 200이고 `/.env.local`, `/.claude/…`, `/CLAUDE.md`가 404인지 확인한다(`.vercelignore`).

## 식별자 (비밀값 아님)
- GitHub: https://github.com/sci-eum/periodic-table-explorer (public, main). GitHub Pages도 켜져 있음.
- Vercel: 팀 `scienceina`(orgId `team_S7b0mly9rrPV6Jw2O2gbqqOB`), 프로젝트 `periodic-table-explorer`(projectId `prj_QeOQFF6ggA5IbVf8JCQv18oBlay6`).
  - production: https://periodic-table-explorer-liard.vercel.app
  - Git 자동 배포는 연결 안 됨(Vercel 계정에 GitHub 로그인 연결이 없음). CLI로 `vercel --prod --yes` 배포한다.
- Supabase: 사용 안 함.
