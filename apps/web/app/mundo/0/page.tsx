'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { detectarIdiomaInicial, guardarIdioma, IDIOMAS_UI } from '@/lib/idioma';

let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.35, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

// ---- Sistema de voz guiada, adaptado al idioma del dispositivo ----
const IDIOMA_DETECTADO: string = typeof window !== 'undefined' ? detectarIdiomaInicial() : 'es';
const LOCALE_VOZ: Record<string, string> = { es: 'es-419', en: 'en-US', pt: 'pt-BR', hi: 'hi-IN', id: 'id-ID', ru: 'ru-RU', vi: 'vi-VN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' };
const FRASES: Record<string, Record<string, string>> = {
  bienvenida: {
    es: '¡Hola! Soy Toqwow. Este es mi planeta. Arrastrame para explorarlo conmigo.',
    en: "Hi! I'm Toqwow. This is my planet. Drag me to explore it with me.",
    pt: 'Oi! Eu sou o Toqwow. Este é o meu planeta. Me arraste para explorá-lo comigo.',
    hi: 'नमस्ते! मैं टॉकवाओ हूँ। यह मेरा ग्रह है। मुझे इसे साथ में घूमने के लिए खींचो।',
    id: 'Hai! Aku Toqwow. Ini planetku. Seret aku untuk menjelajahinya bersama.',
    ru: 'Привет! Я Токвау. Это моя планета. Тяни меня, чтобы исследовать её вместе.',
    vi: 'Xin chào! Mình là Toqwow. Đây là hành tinh của mình. Hãy kéo mình đi khám phá nó nhé.',
    zh: '你好！我是Toqwow。这是我的星球。拖着我一起去探索吧。',
    ja: 'こんにちは！ぼくトクワオだよ。ここはぼくの星だよ。いっしょに探検しよう。',
    ko: '안녕! 나는 토크와우야. 여기는 내 행성이야. 나를 끌어서 같이 탐험해줘.',
  },
  mapa: {
    es: 'Este es el mapa de mi planeta. Tocá una zona para ir ahí.',
    en: 'This is the map of my planet. Tap a zone to go there.',
    pt: 'Este é o mapa do meu planeta. Toque em uma área para ir até lá.',
    hi: 'यह मेरे ग्रह का नक्शा है। किसी जगह पर टैप करके वहाँ जाओ।',
    id: 'Ini peta planetku. Sentuh salah satu area untuk pergi ke sana.',
    ru: 'Это карта моей планеты. Нажми на зону, чтобы туда перейти.',
    vi: 'Đây là bản đồ hành tinh của mình. Chạm vào một khu vực để đến đó.',
    zh: '这是我星球的地图。点一个区域就能去那里。',
    ja: 'これはぼくの星の地図だよ。行きたい場所をタップしてね。',
    ko: '이건 내 행성 지도야. 가고 싶은 곳을 톡 눌러봐.',
  },
  zonaCompleta: {
    es: '¡Muy bien! Encontraste todas las luces de esta zona.',
    en: 'Great job! You found all the lights in this zone.',
    pt: 'Muito bem! Você encontrou todas as luzes desta área.',
    hi: 'शाबाश! तुमने इस जगह की सारी रोशनी ढूंढ ली।',
    id: 'Hebat! Kamu menemukan semua cahaya di area ini.',
    ru: 'Отлично! Ты нашёл все огоньки в этой зоне.',
    vi: 'Giỏi lắm! Bạn đã tìm thấy hết ánh sáng ở khu này.',
    zh: '太棒了！你找到了这个区域的所有亮光。',
    ja: 'すごい！このエリアの光を全部見つけたね。',
    ko: '잘했어! 이 구역의 불빛을 다 찾았어.',
  },
  portalNoListo: {
    es: 'Todavía faltan luces por encontrar en el planeta.',
    en: 'There are still more lights to find on the planet.',
    pt: 'Ainda faltam luzes para encontrar no planeta.',
    hi: 'ग्रह में अभी और रोशनियाँ ढूंढनी बाकी हैं।',
    id: 'Masih ada cahaya yang belum ditemukan di planet ini.',
    ru: 'На планете ещё остались огоньки, которые нужно найти.',
    vi: 'Hành tinh vẫn còn ánh sáng chưa được tìm thấy.',
    zh: '星球上还有亮光没有找到。',
    ja: '星にはまだ見つけていない光があるよ。',
    ko: '행성에는 아직 찾지 못한 불빛이 있어.',
  },
  portalListo: {
    es: '¡Lo lograste! Tocá el cristal para viajar al siguiente mundo.',
    en: 'You did it! Tap the crystal to travel to the next world.',
    pt: 'Você conseguiu! Toque no cristal para viajar para o próximo mundo.',
    hi: 'तुमने कर दिखाया! अगली दुनिया में जाने के लिए क्रिस्टल को छुओ।',
    id: 'Kamu berhasil! Sentuh kristal untuk pergi ke dunia berikutnya.',
    ru: 'У тебя получилось! Нажми на кристалл, чтобы отправиться в следующий мир.',
    vi: 'Bạn đã làm được! Chạm vào pha lê để đến thế giới tiếp theo.',
    zh: '你做到了！点一下水晶前往下一个世界。',
    ja: 'やったね！クリスタルをタップして次の世界へ行こう。',
    ko: '해냈구나! 크리스탈을 눌러서 다음 세계로 가봐.',
  },
  nuevoAmigo: {
    es: '¡Un nuevo amigo llegó a jugar!',
    en: 'A new friend arrived to play!',
    pt: 'Um novo amigo chegou para brincar!',
    hi: 'खेलने के लिए एक नया दोस्त आया!',
    id: 'Teman baru datang untuk bermain!',
    ru: 'Пришёл новый друг поиграть!',
    vi: 'Một người bạn mới đã đến chơi!',
    zh: '来了一个新朋友一起玩！',
    ja: '新しいお友だちが遊びに来たよ！',
    ko: '새로운 친구가 놀러 왔어!',
  },
  presentacionIntro: {
    es: '¡Hola! Soy Toqwow y este es mi planeta. Estos son mis amigos. Elegí con quién querés jugar. Podés cambiar cuando quieras.',
    en: "Hi! I'm Toqwow and this is my planet. These are my friends. Pick who you want to play with. You can change anytime.",
    pt: 'Oi! Eu sou o Toqwow e este é o meu planeta. Estes são meus amigos. Escolha com quem você quer brincar. Você pode trocar quando quiser.',
    hi: 'नमस्ते! मैं टॉकवाओ हूँ और यह मेरा ग्रह है। ये मेरे दोस्त हैं। चुनो किसके साथ खेलना है। तुम कभी भी बदल सकते हो।',
    id: 'Hai! Aku Toqwow dan ini planetku. Ini teman-temanku. Pilih siapa yang mau kamu ajak main. Kamu bisa ganti kapan saja.',
    ru: 'Привет! Я Токвау, и это моя планета. Это мои друзья. Выбери, с кем хочешь играть. Ты можешь поменять в любой момент.',
    vi: 'Xin chào! Mình là Toqwow và đây là hành tinh của mình. Đây là những người bạn của mình. Hãy chọn ai bạn muốn chơi cùng. Bạn có thể đổi bất cứ lúc nào.',
    zh: '你好！我是Toqwow，这是我的星球。这些是我的朋友。选一个你想一起玩的。你随时都可以换。',
    ja: 'こんにちは！ぼくトクワオだよ、ここはぼくの星なんだ。これはぼくのお友だちだよ。だれと遊ぶか選んでね。いつでも変えられるよ。',
    ko: '안녕! 나는 토크와우고 여기는 내 행성이야. 얘들은 내 친구들이야. 누구랑 놀지 골라봐. 언제든지 바꿀 수 있어.',
  },
  elegirParaJugar: {
    es: '¡Ahora tocá a uno para jugar!',
    en: 'Now tap one to play!',
    pt: 'Agora toque em um para jogar!',
    hi: 'अब खेलने के लिए किसी एक को छुओ!',
    id: 'Sekarang sentuh salah satu untuk main!',
    ru: 'А теперь нажми на одного, чтобы играть!',
    vi: 'Bây giờ hãy chạm vào một bạn để chơi!',
    zh: '现在点一个开始玩吧！',
    ja: 'さあ、遊ぶ子をタップしてね！',
    ko: '이제 놀 친구를 하나 눌러봐!',
  },
  zona0: {
    es: 'Tocá el mapa dorado para ver todo mi planeta.',
    en: 'Tap the golden map to see my whole planet.',
    pt: 'Toque no mapa dourado para ver todo o meu planeta.',
    hi: 'मेरा पूरा ग्रह देखने के लिए सुनहरे नक्शे को छुओ।',
    id: 'Sentuh peta emas untuk melihat seluruh planetku.',
    ru: 'Нажми на золотую карту, чтобы увидеть всю мою планету.',
    vi: 'Chạm vào bản đồ vàng để xem toàn bộ hành tinh của mình.',
    zh: '点一下金色的地图，看看我整个星球。',
    ja: '金色の地図をタップしてぼくの星全体を見てみよう。',
    ko: '황금 지도를 눌러서 내 행성 전체를 봐봐.',
  },
  zona1: {
    es: 'Tocá las burbujas de colores para reventarlas.',
    en: 'Tap the colorful bubbles to pop them.',
    pt: 'Toque nas bolhas coloridas para estourá-las.',
    hi: 'रंगीन बुलबुलों को छुओ और फोड़ो।',
    id: 'Sentuh gelembung warna-warni untuk memecahkannya.',
    ru: 'Нажимай на разноцветные пузыри, чтобы лопнуть их.',
    vi: 'Chạm vào những bong bóng đầy màu sắc để làm vỡ chúng.',
    zh: '点一下彩色泡泡把它们戳破。',
    ja: 'カラフルなあわをタップしてはじけさせよう。',
    ko: '알록달록한 방울을 눌러서 터뜨려봐.',
  },
  zona2: {
    es: 'Arrastrá a tu personaje cerca de las piedritas brillantes para hacerlas rebotar.',
    en: 'Drag your character close to the shiny pebbles to make them bounce.',
    pt: 'Arraste seu personagem perto das pedrinhas brilhantes para fazê-las saltar.',
    hi: 'चमकती कंकड़ों के पास अपने किरदार को खींचो ताकि वे उछलें।',
    id: 'Seret karaktermu dekat kerikil berkilau supaya memantul.',
    ru: 'Перетащи своего персонажа поближе к блестящим камешкам, чтобы они подпрыгнули.',
    vi: 'Kéo nhân vật của bạn đến gần những viên sỏi lấp lánh để chúng nảy lên.',
    zh: '把你的角色拖到闪亮的小石头附近，让它们弹起来。',
    ja: 'キャラクターをキラキラした小石の近くまで引っぱってはねさせよう。',
    ko: '네 캐릭터를 반짝이는 조약돌 가까이 끌어서 튕기게 해봐.',
  },
  zona3: {
    es: 'Arrastrá a tu personaje cerca de las antenitas dormidas para encenderlas.',
    en: 'Drag your character close to the sleepy antennas to light them up.',
    pt: 'Arraste seu personagem perto das anteninhas adormecidas para acendê-las.',
    hi: 'सोई हुई एंटेनाओं के पास अपने किरदार को खींचो ताकि वे जल उठें।',
    id: 'Seret karaktermu dekat antena yang tertidur untuk menyalakannya.',
    ru: 'Перетащи своего персонажа поближе к спящим антеннам, чтобы зажечь их.',
    vi: 'Kéo nhân vật của bạn đến gần những chiếc ăng-ten đang ngủ để thắp sáng chúng.',
    zh: '把你的角色拖到沉睡的小天线附近，把它们点亮。',
    ja: 'キャラクターを眠っているアンテナの近くまで引っぱって光らせよう。',
    ko: '잠자는 안테나 가까이 네 캐릭터를 끌어서 불을 켜봐.',
  },
  zona4: {
    es: 'Arrastrá a tu personaje hasta el agua para que flote.',
    en: 'Drag your character into the water so they float.',
    pt: 'Arraste seu personagem até a água para que ele flutue.',
    hi: 'अपने किरदार को पानी तक खींचो ताकि वह तैरे।',
    id: 'Seret karaktermu ke air supaya dia mengapung.',
    ru: 'Перетащи своего персонажа в воду, чтобы он поплыл.',
    vi: 'Kéo nhân vật của bạn xuống nước để bạn ấy nổi lên.',
    zh: '把你的角色拖到水里，让他漂起来。',
    ja: 'キャラクターを水の中まで引っぱって浮かせよう。',
    ko: '네 캐릭터를 물 속으로 끌어서 떠다니게 해봐.',
  },
  zona5: {
    es: 'Arrastrá a tu personaje cerca de los cristales para escuchar su canto.',
    en: 'Drag your character close to the crystals to hear them sing.',
    pt: 'Arraste seu personagem perto dos cristais para ouvir o canto deles.',
    hi: 'क्रिस्टलों के पास अपने किरदार को खींचो और उनका गाना सुनो।',
    id: 'Seret karaktermu dekat kristal untuk mendengar nyanyiannya.',
    ru: 'Перетащи своего персонажа поближе к кристаллам, чтобы услышать их пение.',
    vi: 'Kéo nhân vật của bạn đến gần những viên pha lê để nghe chúng hát.',
    zh: '把你的角色拖到水晶附近，听听它们的歌声。',
    ja: 'キャラクターをクリスタルの近くまで引っぱって歌声を聞いてみよう。',
    ko: '크리스탈 가까이 네 캐릭터를 끌어서 노래를 들어봐.',
  },
  zona6: {
    es: 'Arrastrá a tu personaje por el sendero dorado para descubrir algo.',
    en: 'Drag your character along the golden path to discover something.',
    pt: 'Arraste seu personagem pelo caminho dourado para descobrir algo.',
    hi: 'सुनहरे रास्ते पर अपने किरदार को खींचो और कुछ खोजो।',
    id: 'Seret karaktermu di sepanjang jalan emas untuk menemukan sesuatu.',
    ru: 'Перетащи своего персонажа по золотой тропе, чтобы что-то найти.',
    vi: 'Kéo nhân vật của bạn dọc theo con đường vàng để khám phá điều gì đó.',
    zh: '把你的角色拖到金色小路上，发现点什么。',
    ja: 'キャラクターを金色の道まで引っぱって何か見つけよう。',
    ko: '황금빛 길을 따라 네 캐릭터를 끌어서 뭔가 발견해봐.',
  },
  zona7: {
    es: 'Arrastrá a tu personaje cerca del círculo de luz para saludar a la visita.',
    en: 'Drag your character close to the circle of light to greet the visitor.',
    pt: 'Arraste seu personagem perto do círculo de luz para cumprimentar a visita.',
    hi: 'रोशनी के गोले के पास अपने किरदार को खींचो और मेहमान को नमस्ते कहो।',
    id: 'Seret karaktermu dekat lingkaran cahaya untuk menyapa tamu itu.',
    ru: 'Перетащи своего персонажа поближе к светящемуся кругу, чтобы поприветствовать гостя.',
    vi: 'Kéo nhân vật của bạn đến gần vòng tròn ánh sáng để chào vị khách.',
    zh: '把你的角色拖到光环附近，跟来的客人打招呼。',
    ja: 'キャラクターを光の輪の近くまで引っぱってお客さんにあいさつしよう。',
    ko: '빛의 원 가까이 네 캐릭터를 끌어서 손님에게 인사해봐.',
  },
  zona8: {
    es: 'Arrastrá a tu personaje cerca de las cúpulas para conocer a los ayudantes.',
    en: 'Drag your character close to the domes to meet the little helpers.',
    pt: 'Arraste seu personagem perto das cúpulas para conhecer os ajudantes.',
    hi: 'गुंबदों के पास अपने किरदार को खींचो और छोटे मददगारों से मिलो।',
    id: 'Seret karaktermu dekat kubah untuk bertemu para penolong kecil.',
    ru: 'Перетащи своего персонажа поближе к куполам, чтобы познакомиться с маленькими помощниками.',
    vi: 'Kéo nhân vật của bạn đến gần những mái vòm để gặp các bạn trợ giúp nhỏ.',
    zh: '把你的角色拖到圆顶附近，认识一下小帮手们。',
    ja: 'キャラクターをドームの近くまで引っぱって小さな助っ人に会おう。',
    ko: '돔 가까이 네 캐릭터를 끌어서 꼬마 도우미들을 만나봐.',
  },
  zona9: {
    es: 'Juntá todas las luces del planeta para abrir el portal.',
    en: 'Collect all the lights on the planet to open the portal.',
    pt: 'Colete todas as luzes do planeta para abrir o portal.',
    hi: 'द्वार खोलने के लिए ग्रह की सारी रोशनियाँ इकट्ठा करो।',
    id: 'Kumpulkan semua cahaya di planet ini untuk membuka portal.',
    ru: 'Собери все огоньки на планете, чтобы открыть портал.',
    vi: 'Thu thập hết ánh sáng trên hành tinh để mở cổng.',
    zh: '收集星球上所有的亮光，打开传送门。',
    ja: '星の光を全部集めてポータルを開けよう。',
    ko: '행성의 불빛을 모두 모아서 포털을 열어봐.',
  },
};

let mutedGlobal = false;
let idiomaGlobal = IDIOMA_DETECTADO;
const hablar = (clave: string) => {
  if (mutedGlobal) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const dict = FRASES[clave];
  if (!dict) return;
  const texto = dict[idiomaGlobal] || dict['es'];
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = LOCALE_VOZ[idiomaGlobal] || 'es-419';
    u.rate = 0.95; u.pitch = 1.2; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {}
};
const hablarTexto = (texto: string, onEnd?: () => void) => {
  if (mutedGlobal) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { if (onEnd) setTimeout(onEnd, 1200); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = LOCALE_VOZ[idiomaGlobal] || 'es-419';
    u.rate = 0.95; u.pitch = 1.2; u.volume = 1;
    if (onEnd) {
      let terminado = false;
      const finalizar = () => { if (terminado) return; terminado = true; onEnd(); };
      u.onend = finalizar;
      u.onerror = finalizar;
      // Respaldo por si el navegador nunca dispara onend/onerror (pasa en algunos Android)
      setTimeout(finalizar, Math.max(1800, texto.length * 90));
    }
    window.speechSynthesis.speak(u);
  } catch { if (onEnd) setTimeout(onEnd, 1200); }
};

const PROGRESO_TXT = {
  faltanZona: {
    es: (n: number) => `Todavía faltan ${n} luces en esta zona.`,
    en: (n: number) => `There are still ${n} lights left in this zone.`,
    pt: (n: number) => `Ainda faltam ${n} luzes nesta área.`,
    hi: (n: number) => `इस जगह में अभी भी ${n} रोशनियाँ बाकी हैं।`,
    id: (n: number) => `Masih ada ${n} cahaya lagi di area ini.`,
    ru: (n: number) => `В этой зоне осталось ещё ${n} огоньков.`,
    vi: (n: number) => `Khu này vẫn còn ${n} ánh sáng nữa.`,
    zh: (n: number) => `这个区域还差${n}个亮光。`,
    ja: (n: number) => `このエリアにはまだ${n}個光が残っているよ。`,
    ko: (n: number) => `이 구역에는 아직 불빛이 ${n}개 남아 있어.`,
  },
  zonaLista: {
    es: '¡Ya encontraste todas las luces de esta zona! Seguí explorando el planeta.',
    en: 'You found all the lights in this zone! Keep exploring the planet.',
    pt: 'Você encontrou todas as luzes desta área! Continue explorando o planeta.',
    hi: 'तुमने इस जगह की सारी रोशनी ढूंढ ली! ग्रह में और घूमो।',
    id: 'Kamu sudah menemukan semua cahaya di area ini! Terus jelajahi planetnya.',
    ru: 'Ты нашёл все огоньки в этой зоне! Продолжай исследовать планету.',
    vi: 'Bạn đã tìm thấy hết ánh sáng ở khu này! Hãy tiếp tục khám phá hành tinh.',
    zh: '你已经找到这个区域的所有亮光了！继续探索星球吧。',
    ja: 'このエリアの光を全部見つけたね！星を探検し続けよう。',
    ko: '이 구역의 불빛을 다 찾았어! 행성을 계속 탐험해봐.',
  },
  faltanMundo: {
    es: (n: number) => `Te faltan ${n} luces en todo el planeta para abrir el portal.`,
    en: (n: number) => `You need ${n} more lights on the whole planet to open the portal.`,
    pt: (n: number) => `Faltam ${n} luzes em todo o planeta para abrir o portal.`,
    hi: (n: number) => `द्वार खोलने के लिए पूरे ग्रह में ${n} और रोशनियाँ चाहिए।`,
    id: (n: number) => `Kamu perlu ${n} cahaya lagi di seluruh planet untuk membuka portal.`,
    ru: (n: number) => `Тебе нужно найти ещё ${n} огоньков на всей планете, чтобы открыть портал.`,
    vi: (n: number) => `Bạn cần thêm ${n} ánh sáng trên cả hành tinh để mở cổng.`,
    zh: (n: number) => `整个星球还差${n}个亮光才能打开传送门。`,
    ja: (n: number) => `ポータルを開けるには、星全体であと${n}個の光が必要だよ。`,
    ko: (n: number) => `포털을 열려면 행성 전체에서 불빛이 ${n}개 더 필요해.`,
  },
  mundoListo: {
    es: 'Ya juntaste todas las luces. ¡Andá al Corazón del Planeta para pasar al siguiente mundo!',
    en: "You've collected all the lights. Head to the Heart of the Planet to move to the next world!",
    pt: 'Você já coletou todas as luzes. Vá ao Coração do Planeta para ir ao próximo mundo!',
    hi: 'तुमने सारी रोशनियाँ इकट्ठा कर लीं। अगली दुनिया में जाने के लिए ग्रह के हृदय पर जाओ!',
    id: 'Kamu sudah mengumpulkan semua cahaya. Pergi ke Jantung Planet untuk lanjut ke dunia berikutnya!',
    ru: 'Ты собрал все огоньки. Иди к Сердцу Планеты, чтобы перейти в следующий мир!',
    vi: 'Bạn đã thu thập hết ánh sáng. Hãy đến Trái Tim Hành Tinh để sang thế giới tiếp theo!',
    zh: '你已经收集了所有的亮光。去星球之心，进入下一个世界吧！',
    ja: '光を全部集めたね。次の世界に行くには星のハートへ行こう！',
    ko: '불빛을 다 모았어. 다음 세계로 가려면 행성의 심장으로 가봐!',
  },
};


type Hotspot = { x: number; y: number; };
type Zona = { indice: number; nombre: string; archivo: string; thumb: string; hotspots: Hotspot[]; };

const ZONA_WIDTH = 2752;
const ZONA_HEIGHT = 1536;

const ZONAS: Zona[] = [
  { indice: 1, nombre: 'Nido de Musgo Violeta', archivo: 'zona_01_nido_musgo.webp', thumb: 'thumb_01_nido_musgo.webp', hotspots: [{x:950,y:780},{x:1510,y:880},{x:2490,y:880}] },
  { indice: 2, nombre: 'Cráter de las Primeras Burbujas', archivo: 'zona_02_crater_burbujas.webp', thumb: 'thumb_02_crater_burbujas.webp', hotspots: [{x:810,y:780},{x:1510,y:880},{x:2490,y:880}] },
  { indice: 3, nombre: 'Montañas de Orejas Redondas', archivo: 'zona_03_montanas_orejas.webp', thumb: 'thumb_03_montanas_orejas.webp', hotspots: [{x:670,y:780},{x:1930,y:680},{x:2490,y:780}] },
  { indice: 4, nombre: 'Valle de las Antenitas Dormidas', archivo: 'zona_04_valle_antenitas.webp', thumb: 'thumb_04_valle_antenitas.webp', hotspots: [{x:810,y:880},{x:1930,y:680},{x:250,y:680}] },
  { indice: 5, nombre: 'Laguna de Gravedad Curva', archivo: 'zona_05_laguna_gravedad.webp', thumb: 'thumb_05_laguna_gravedad.webp', hotspots: [{x:670,y:780},{x:2490,y:880},{x:1930,y:980}] },
  { indice: 6, nombre: 'Ruinas de Cristal de los Primeros Viajeros', archivo: 'zona_06_ruinas_primeros_viajeros.webp', thumb: 'thumb_06_ruinas_primeros_viajeros.webp', hotspots: [{x:670,y:780},{x:1370,y:980},{x:2210,y:680}] },
  { indice: 7, nombre: 'Sendero de las Líneas Doradas', archivo: 'zona_07_sendero_lineas_doradas.webp', thumb: 'thumb_07_sendero_lineas_doradas.webp', hotspots: [{x:1790,y:780},{x:1230,y:780},{x:2490,y:880}] },
  { indice: 8, nombre: 'Círculo de los Visitantes', archivo: 'zona_08_circulo_visitantes.webp', thumb: 'thumb_08_circulo_visitantes.webp', hotspots: [{x:1230,y:780},{x:1790,y:780},{x:250,y:680}] },
  { indice: 9, nombre: 'Puerto de las Cúpulas de Cristal', archivo: 'zona_09_puerto_cupulas.webp', thumb: 'thumb_09_puerto_cupulas.webp', hotspots: [{x:1230,y:780},{x:1790,y:780},{x:670,y:980}] },
  { indice: 10, nombre: 'Corazón del Planeta', archivo: 'zona_10_corazon_planeta.webp', thumb: 'thumb_10_corazon_planeta.webp', hotspots: [{x:950,y:880},{x:1930,y:680},{x:390,y:880}] },
];

const TOTAL_HOTSPOTS = ZONAS.reduce((acc, z) => acc + z.hotspots.length, 0);

const ICONO_ZONA = ['🌿', '🫧', '🏔️', '📡', '💧', '🔮', '🌟', '🛸', '🏠', '💎'];
const ZONA_WOW_COLOR: Record<number, string> = {
  0: 'rgba(184,169,255,.5)', 1: 'rgba(0,212,200,.45)', 2: 'rgba(255,215,0,.4)',
  3: 'rgba(255,179,209,.45)', 4: 'rgba(0,212,200,.55)', 5: 'rgba(255,215,0,.45)',
  6: 'rgba(255,215,0,.5)', 7: 'rgba(150,220,180,.5)', 8: 'rgba(184,169,255,.45)', 9: 'rgba(255,255,255,.55)',
};

type ActiveBurst = { id: number; x: number; y: number; zonaIdx: number; tipo?: 'sparkle' | 'splash' | 'tema'; emoji?: string; };

export default function Mundo0() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const [trail, setTrail] = useState<{ id: number; x: number; y: number }[]>([]);
  const trailId = useRef(0);
  const lastTrailT = useRef<Record<string, number>>({});
  const [showGuide, setShowGuide] = useState(true);
  const [mostrarPresentacion, setMostrarPresentacion] = useState(false);
  const [presentacionIdx, setPresentacionIdx] = useState(0);
  const [personajeActivo, setPersonajeActivo] = useState<string>('toqwow');
  const [zonaCompanero, setZonaCompanero] = useState<number>(0); // en que zona esta parado el personaje (una sola, no en todas a la vez)
  const [showMap, setShowMap] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [portalNudge, setPortalNudge] = useState(false);
  const [muted, setMuted] = useState(false);
  const [idioma, setIdioma] = useState<string>('es');
  const burstId = useRef(0);

  useEffect(() => { mutedGlobal = muted; }, [muted]);
  useEffect(() => { idiomaGlobal = idioma; }, [idioma]);

  // El idioma real (detectado o guardado) se aplica recien montado en el cliente,
  // para que el primer render coincida siempre con el HTML del servidor (evita
  // errores de hidratacion que podian tirar abajo toda la pagina).
  useEffect(() => {
    const real = detectarIdiomaInicial();
    if (real !== 'es') setIdioma(real);
  }, []);

  const elegirIdioma = useCallback((id: string) => {
    setIdioma(id);
    guardarIdioma(id as any);
    note(659, 0.15, 0.15);
  }, []);

  // Roster de amigos adicionales, convocables desde la bandeja inferior
  const AMIGOS_EXTRA = [
    { id: 'zoe', src: 'char_zoe.png', nombre: 'Zoe' },
    { id: 'puli', src: 'char_puli.png', nombre: 'Puli' },
    { id: 'tito', src: 'char_tito.png', nombre: 'Tito' },
    { id: 'luta', src: 'char_luta.png', nombre: 'Luta' },
    { id: 'copo', src: 'char_copo.png', nombre: 'Copo de Nieve' },
    { id: 'vago', src: 'char_vago_v2.png', nombre: 'Vago' },
    { id: 'michi', src: 'char_michi_v3.png', nombre: 'Michi' },
  ];
  // Roster completo (10) para la presentacion inicial y referencia general
  const TODOS_PERSONAJES = [
    { id: 'toqwow', src: 'char_toqwow_v3.png', nombre: 'Toqwow' },
    { id: 'tizi', src: 'char_tizi_v3.png', nombre: 'Tizi' },
    { id: 'coti', src: 'char_coti_v3.png', nombre: 'Coti' },
    ...AMIGOS_EXTRA,
  ];
  const PERSONAJE_POR_ID: Record<string, { src: string; nombre: string }> = Object.fromEntries(
    TODOS_PERSONAJES.map(p => [p.id, { src: p.src, nombre: p.nombre }])
  );
  const [amigosEnJuego, setAmigosEnJuego] = useState<Record<string, number>>({}); // id -> zonaIdx donde esta parado
  const [zonaVisible, setZonaVisible] = useState(0);

  const detectarZonaVisible = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const zw = el.scrollWidth / ZONAS.length;
    return Math.round(el.scrollLeft / zw);
  }, []);

  const zonasExplicadasRef = useRef<Set<number>>(new Set());
  const [cartelZona, setCartelZona] = useState<number | null>(null);
  const [cartelAyuda, setCartelAyuda] = useState<string | null>(null);
  const [companionPulseZona, setCompanionPulseZona] = useState<number | null>(null);
  const cartelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pedirAyuda = useCallback((zi: number) => {
    const faltanZona = ZONAS[zi].hotspots.filter((_, hi) => !collected.has(`${zi}-${hi}`)).length;
    const faltanMundo = TOTAL_HOTSPOTS - collected.size;
    const IDIOMAS_SOPORTADOS = ['es', 'en', 'pt', 'hi', 'id', 'ru', 'vi', 'zh', 'ja', 'ko'] as const;
    const idx = (IDIOMAS_SOPORTADOS.includes(idioma as any) ? idioma : 'es') as typeof IDIOMAS_SOPORTADOS[number];
    const parte1 = faltanZona > 0 ? PROGRESO_TXT.faltanZona[idx](faltanZona) : PROGRESO_TXT.zonaLista[idx];
    const parte2 = faltanMundo > 0 ? PROGRESO_TXT.faltanMundo[idx](faltanMundo) : PROGRESO_TXT.mundoListo[idx];
    const texto = `${parte1} ${parte2}`;
    setCartelZona(null);
    setCartelAyuda(texto);
    hablarTexto(texto);
    note(659, 0.15, 0.15);
    if (cartelTimeoutRef.current) clearTimeout(cartelTimeoutRef.current);
    cartelTimeoutRef.current = setTimeout(() => setCartelAyuda(null), 5500);
  }, [collected, idioma]);

  const mostrarCartelZona = useCallback((zi: number) => {
    if (zonasExplicadasRef.current.has(zi)) return;
    zonasExplicadasRef.current.add(zi);
    setCartelZona(zi);
    hablar(`zona${zi}`);
    if (cartelTimeoutRef.current) clearTimeout(cartelTimeoutRef.current);
    cartelTimeoutRef.current = setTimeout(() => setCartelZona(null), 4200);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || mostrarPresentacion) return;
    let debounce: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const nueva = detectarZonaVisible();
        setZonaVisible(nueva);
        mostrarCartelZona(nueva);
      }, 350);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Mostrar cartel de la Zona 0 apenas se carga el mundo (o apenas se cierra la presentacion)
    const t = setTimeout(() => mostrarCartelZona(0), 1200);
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(debounce); clearTimeout(t); };
  }, [detectarZonaVisible, mostrarCartelZona, mostrarPresentacion]);

  const convocarAmigo = useCallback((id: string) => {
    setAmigosEnJuego(prev => ({ ...prev, [id]: zonaVisible }));
    hablar('nuevoAmigo');
    melody([440, 554, 659], 90, 0.25, 0.16);
    vib(15);
  }, [zonaVisible]);

  // ---- Sistema transversal de arrastre: fisica de inercia + squash&stretch + reacciones ----
  type DragInfo = { key: string; startClientX: number; startClientY: number; startX: number; startY: number; lastX: number; lastY: number; lastT: number; vx: number; vy: number; };
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const [squash, setSquash] = useState<Record<string, 'grab' | 'drop' | null>>({});
  const [floating, setFloating] = useState<Record<string, boolean>>({});
  const dragState = useRef<DragInfo | null>(null);
  const mapHoverStartT = useRef<number | null>(null);
  const rafRef = useRef<Record<string, number>>({});
  const lastRunSoundT = useRef<Record<string, number>>({});
  const runStepAlto = useRef<Record<string, boolean>>({});
  const yaReaccionoEnDrag = useRef<Record<string, Set<number>>>({});
  const lastHoverCheckT = useRef<Record<string, number>>({});

  const clearCoast = (key: string) => {
    if (rafRef.current[key]) { cancelAnimationFrame(rafRef.current[key]); delete rafRef.current[key]; }
  };

  const startDrag = useCallback((key: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    clearCoast(key);
    const current = dragPos[key] || { x: 0, y: 0 };
    const now = performance.now();
    dragState.current = { key, startClientX: e.clientX, startClientY: e.clientY, startX: current.x, startY: current.y, lastX: e.clientX, lastY: e.clientY, lastT: now, vx: 0, vy: 0 };
    setSquash(prev => ({ ...prev, [key]: 'grab' }));
    setPersonajeActivo(key.slice(0, key.lastIndexOf('-')));
    const ziDeKey = parseInt(key.slice(key.lastIndexOf('-') + 1), 10);
    if (!Number.isNaN(ziDeKey)) setZonaCompanero(ziDeKey);
    delete yaReaccionoEnDrag.current[key];
    mapHoverStartT.current = null;
    note(660, 0.15, 0.15); vib(10);
  }, [dragPos]);

  const coast = useCallback((key: string, vx: number, vy: number) => {
    let velX = vx * 16, velY = vy * 16;
    const friction = 0.9;
    const step = () => {
      velX *= friction; velY *= friction;
      setDragPos(prev => {
        const cur = prev[key] || { x: 0, y: 0 };
        return { ...prev, [key]: { x: cur.x + velX, y: cur.y + velY } };
      });
      if (Math.abs(velX) > 0.3 || Math.abs(velY) > 0.3) {
        rafRef.current[key] = requestAnimationFrame(step);
      } else {
        delete rafRef.current[key];
      }
    };
    rafRef.current[key] = requestAnimationFrame(step);
  }, []);

  // Puntos de reaccion tematica por zona (reutilizan coordenadas de los hotspots como anclas de objetos clave)
  const PUNTOS_REACCION: Record<number, { x: number; y: number; tipo: string; emoji: string; sonido: () => void }[]> = {};
  const RADIO_REACCION = 260; // px en coordenadas nativas de la zona (2752x1536)
  const RADIO_HOTSPOT = 260; // px en coordenadas nativas — mismo criterio que los puntos tematicos
  const [rumbleZona, setRumbleZona] = useState<number | null>(null);

  // Reacciones de personalidad: que hace CADA personaje al soltarlo en CADA zona (segun el GDD)
  const REACCIONES_PERSONAJE: Record<string, { emoji: string; sonido: () => void }> = {};
  const CELEBRACION_PERSONAJE: Record<string, string> = {
    toqwow: '🌟', tizi: '🎀', coti: '👓', zoe: '🎉', puli: '📚', tito: '💃', luta: '💪', copo: '🐾', vago: '🐕', michi: '😻',
  };

  const chequearPuntosTematicos = useCallback((zi: number, key: string, e: React.PointerEvent) => {
    const puntos = PUNTOS_REACCION[zi];
    if (!puntos) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const container = target.closest('[data-zona-container]') as HTMLElement | null;
    if (!container) return;
    const contRect = container.getBoundingClientRect();
    const relX = (rect.left + rect.width / 2 - contRect.left) / contRect.width;
    const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
    const nativeX = relX * ZONA_WIDTH;
    const nativeY = relY * ZONA_HEIGHT;
    const yaSet = yaReaccionoEnDrag.current[key] || (yaReaccionoEnDrag.current[key] = new Set());
    for (let pi = 0; pi < puntos.length; pi++) {
      if (yaSet.has(pi)) continue;
      const punto = puntos[pi];
      const dist = Math.hypot(nativeX - punto.x, nativeY - punto.y);
      if (dist < RADIO_REACCION) {
        yaSet.add(pi);
        const id = ++burstId.current;
        const px = contRect.left + (punto.x / ZONA_WIDTH) * contRect.width;
        const py = contRect.top + (punto.y / ZONA_HEIGHT) * contRect.height;
        setBursts(prev => [...prev, { id, x: px, y: py, zonaIdx: zi, tipo: 'tema', emoji: punto.emoji }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1300);
        punto.sonido();
        melody([440, 659, 880], 80, 0.25, 0.18);
        vib(punto.tipo === 'rumble' ? [10, 30, 10] : [15, 20, 15]);
        if (punto.tipo === 'rumble') {
          setRumbleZona(zi);
          setTimeout(() => setRumbleZona(null), 350);
        }
        break;
      }
    }
  }, []);

  const chequearReaccion = useCallback((zi: number, key: string, e: React.PointerEvent) => {
    const charId = key.slice(0, key.lastIndexOf('-'));
    if (zi === 4) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const container = target.closest('[data-zona-container]') as HTMLElement | null;
      if (!container) return;
      const contRect = container.getBoundingClientRect();
      const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
      const enAgua = relY > 0.42;

      // Michi se resiste al agua: reaccion propia en vez de flotar
      if (charId === 'michi' && enAgua) {
        const id = ++burstId.current;
        setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'sparkle', emoji: '💨' }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        note(311, 0.2, 0.2, 'sawtooth');
        vib([10, 10, 10]);
        return;
      }

      const yaFlotando = !!floating[key];
      setFloating(prev => ({ ...prev, [key]: enAgua }));
      if (enAgua && !yaFlotando) {
        const id = ++burstId.current;
        setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'splash' }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        melody([392, 330, 262], 110, 0.35, 0.2);
        vib([15, 20, 15, 30]);
      } else if (!enAgua && yaFlotando) {
        note(440, 0.15, 0.15);
      }
      return;
    }

    // Reaccion de personalidad especifica (personaje + zona), si esta definida
    const reaccionPersonal = REACCIONES_PERSONAJE[`${zi}-${charId}`];
    if (reaccionPersonal) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const id = ++burstId.current;
      setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'sparkle', emoji: reaccionPersonal.emoji }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
      reaccionPersonal.sonido();
      vib(15);
      return;
    }

    // Celebracion especial en el Corazon del Planeta (Zona 10) si el mundo ya esta completo
    if (zi === 9 && collected.size === TOTAL_HOTSPOTS) {
      const emoji = CELEBRACION_PERSONAJE[charId];
      if (emoji) {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const id = ++burstId.current;
        setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'sparkle', emoji }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        melody([659, 784, 988, 1318], 80, 0.3, 0.2);
        vib([15, 15, 15, 40]);
        return;
      }
    }

    chequearPuntosTematicos(zi, key, e);
  }, [floating, chequearPuntosTematicos, collected]);

  const squashTransform = (key: string) => {
    const sq = squash[key];
    if (sq === 'grab') return 'scale(0.88,1.12)';
    if (sq === 'drop') return 'scale(1.15,0.85)';
    return 'scale(1,1)';
  };


  // Presentacion inicial: Toqwow nombra a los 10 personajes disponibles desde el dia 1,
  // cada vez que se entra a Mundo 0 (Planeta Tiqui). El nino puede cambiar de personaje activo en
  // cualquier zona despues (bandeja + Tizi/Coti siempre presentes).
  useEffect(() => {
    setMostrarPresentacion(true);
  }, []);

  useEffect(() => {
    if (!mostrarPresentacion) return;
    let cancelado = false;

    if (presentacionIdx === 0) {
      const t0 = setTimeout(() => {
        if (cancelado) return;
        melody([523, 659, 784], 80, 0.3, 0.18);
        vib(15);
        hablarTexto(FRASES.presentacionIntro[idiomaGlobal] || FRASES.presentacionIntro.es, () => {
          if (cancelado) return;
          setTimeout(() => { if (!cancelado) setPresentacionIdx(1); }, 500);
        });
      }, 600);
      return () => { cancelado = true; clearTimeout(t0); };
    }

    const i = presentacionIdx - 1;
    if (i < TODOS_PERSONAJES.length) {
      const t = setTimeout(() => {
        if (cancelado) return;
        note(880, 0.15, 0.15);
        vib(10);
        hablarTexto(TODOS_PERSONAJES[i].nombre, () => {
          if (cancelado) return;
          setTimeout(() => { if (!cancelado) setPresentacionIdx(p => p + 1); }, 450);
        });
      }, 350);
      return () => { cancelado = true; clearTimeout(t); };
    }

    if (i === TODOS_PERSONAJES.length) {
      // Ya se nombraron los 10 — ahora se indica que elija uno para jugar
      const t3 = setTimeout(() => {
        if (cancelado) return;
        melody([659, 784, 988], 90, 0.3, 0.2);
        vib([15, 15, 30]);
        hablarTexto(FRASES.elegirParaJugar[idiomaGlobal] || FRASES.elegirParaJugar.es);
      }, 500);
      return () => { cancelado = true; clearTimeout(t3); };
    }
  }, [mostrarPresentacion, presentacionIdx]);

  const cerrarPresentacion = useCallback((idElegido?: string) => {
    setMostrarPresentacion(false);
    if (idElegido) setPersonajeActivo(idElegido);
    melody([440, 554, 659, 880], 90, 0.3, 0.2);
    vib([15, 20, 15, 30]);
    setTimeout(() => hablar('bienvenida'), 500);
  }, []);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && window.localStorage.getItem('toqwow_mundo0_tutorial_visto');
    if (seen) setShowGuide(false);
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    try { window.localStorage.setItem('toqwow_mundo0_tutorial_visto', '1'); } catch {}
  }, []);

  const [zonaCelebrando, setZonaCelebrando] = useState<number | null>(null);
  const [wowZona, setWowZona] = useState<number | null>(null);

  const dispararWow = useCallback((zi: number) => {
    setWowZona(zi);
    const secuencias: Record<number, () => void> = {
      0: () => melody([659, 784, 988, 1318], 110, 0.4, 0.22),
      1: () => { melody([392, 494, 587, 740, 880], 90, 0.35, 0.2); },
      2: () => melody([523, 659, 784, 1046, 1318], 80, 0.3, 0.2),
      3: () => melody([440, 554, 659, 880, 1108], 100, 0.35, 0.22),
      4: () => melody([392, 330, 392, 494, 587], 100, 0.3, 0.2),
      5: () => melody([784, 880, 988, 1174], 120, 0.4, 0.2),
      6: () => melody([659, 830, 988, 1318, 1568], 90, 0.3, 0.22),
      7: () => { note(90, 0.4, 0.25, 'sawtooth'); setTimeout(() => melody([440, 554, 659], 100, 0.3, 0.2), 300); },
      8: () => melody([523, 659, 784, 1046], 130, 0.45, 0.22),
      9: () => melody([659, 784, 988, 1318, 1568, 2093], 100, 0.4, 0.25),
    };
    (secuencias[zi] || secuencias[0])();
    vib([20, 40, 20, 40, 90]);
    setTimeout(() => setWowZona(null), 2600);
  }, []);

  const activarHotspot = useCallback((zonaIdx: number, hIdx: number, x: number, y: number) => {
    const key = `${zonaIdx}-${hIdx}`;
    setCollected(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      const zonaYaCompletaba = ZONAS[zonaIdx].hotspots.every((_, hi) => next.has(`${zonaIdx}-${hi}`));
      const zonaYaEstabaCompleta = ZONAS[zonaIdx].hotspots.every((_, hi) => prev.has(`${zonaIdx}-${hi}`));
      if (zonaYaCompletaba && !zonaYaEstabaCompleta) {
        setTimeout(() => {
          setZonaCelebrando(zonaIdx);
          hablar('zonaCompleta');
          dispararWow(zonaIdx);
          setTimeout(() => setZonaCelebrando(null), 1800);
        }, 200);
      }
      return next;
    });
    const id = ++burstId.current;
    setBursts(prev => [...prev, { id, x, y, zonaIdx, tipo: 'sparkle' }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
    melody([523, 659, 784]);
    vib(20);
    if (showGuide) dismissGuide();
  }, [showGuide, dismissGuide, dispararWow]);

  // Las lucesitas ya no se completan al tocarlas: se completan al soltar un personaje
  // arrastrado cerca (mismo criterio de proximidad que los puntos tematicos). Devuelve
  // true si activo alguna, para que endDrag sepa que hubo match.
  const chequearHotspots = useCallback((zi: number, e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const container = target.closest('[data-zona-container]') as HTMLElement | null;
    if (!container) return false;
    const contRect = container.getBoundingClientRect();
    const relX = (rect.left + rect.width / 2 - contRect.left) / contRect.width;
    const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
    const nativeX = relX * ZONA_WIDTH;
    const nativeY = relY * ZONA_HEIGHT;
    const zona = ZONAS[zi];
    for (let hi = 0; hi < zona.hotspots.length; hi++) {
      const key = `${zi}-${hi}`;
      if (collected.has(key)) continue;
      const h = zona.hotspots[hi];
      const dist = Math.hypot(nativeX - h.x, nativeY - h.y);
      if (dist < RADIO_HOTSPOT) {
        const px = contRect.left + (h.x / ZONA_WIDTH) * contRect.width;
        const py = contRect.top + (h.y / ZONA_HEIGHT) * contRect.height;
        activarHotspot(zi, hi, px, py);
        return true;
      }
    }
    return false;
  }, [collected, activarHotspot]);

  const abrirMapaConSonido = useCallback(() => {
    setShowMap(true);
    melody([392, 523, 659], 90, 0.3, 0.15);
    vib(15);
    hablar('mapa');
  }, []);

  // Zona 0 "Puerta de Musgo": el tronco-mapa esta en left:22%, top:66% del contenedor de zona
  const irAZona = useCallback((zi: number) => {
    setShowMap(false);
    const el = scrollRef.current;
    if (!el) return;
    const target = el.children[zi] as HTMLElement;
    target?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    // El personaje elegido "viaja con vos": deja de existir en la zona anterior y
    // aparece limpio (sin offsets viejos) en la zona elegida, resaltado.
    const key = `${personajeActivo}-${zi}`;
    setDragPos(prev => ({ ...prev, [key]: { x: 0, y: 0 } }));
    setZonaCompanero(zi);
    setTimeout(() => {
      note(880, 0.15, 0.15);
      vib(15);
      setCompanionPulseZona(zi);
      setTimeout(() => setCompanionPulseZona(null), 1700);
    }, 550);
  }, [personajeActivo]);

  // Con el mapa abierto, si el personaje (que se sigue arrastrando, sin haber soltado
  // el dedo) pasa sobre una miniatura de zona, viaja ahi mismo -- gesto continuo,
  // sin necesitar un segundo toque separado.
  const chequearThumbnailMapa = useCallback((e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const thumbEl = el?.closest('[data-zona-thumb]') as HTMLElement | null;
    if (!thumbEl) return;
    const zi = parseInt(thumbEl.getAttribute('data-zona-thumb') || '-1', 10);
    if (zi < 0) return;
    if (dragState.current) {
      const key = dragState.current.key;
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
      dragState.current = null;
      autoScrollDir.current = 0;
      setSquash(prev => ({ ...prev, [key]: null }));
    }
    irAZona(zi);
  }, [irAZona]);

  const chequearTroncoMapa = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const container = target.closest('[data-zona-container]') as HTMLElement | null;
    if (!container) return;
    const contRect = container.getBoundingClientRect();
    const relX = (rect.left + rect.width / 2 - contRect.left) / contRect.width;
    const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
    const nativeX = relX * ZONA_WIDTH;
    const nativeY = relY * ZONA_HEIGHT;
    const dist = Math.hypot(nativeX - 0.13 * ZONA_WIDTH, nativeY - 0.16 * ZONA_HEIGHT);
    const RADIO_MAPA = 140; // ajustado al circulo mas chico, ya no se cruza al pasar hacia la Zona 2
    if (dist < RADIO_MAPA) {
      const ahora = performance.now();
      if (mapHoverStartT.current === null) {
        mapHoverStartT.current = ahora; // recien entra: todavia no abre, evita toques al pasar de largo
        return;
      }
      if (ahora - mapHoverStartT.current > 400) {
        abrirMapaConSonido();
        // El arrastre sigue activo a proposito: el mismo gesto puede continuar hasta
        // soltar el personaje sobre una zona del mapa (ver chequearThumbnailMapa).
      }
    } else {
      mapHoverStartT.current = null;
    }
  }, [abrirMapaConSonido]);

  // Auto-scroll al arrastrar cerca del borde de la pantalla: el fondo se mueve solo
  // y el personaje se mantiene "pegado" al dedo (se compensa el offset del scroll).
  const autoScrollDir = useRef<0 | 1 | -1>(0);
  const autoScrollRAF = useRef<number | null>(null);

  const runAutoScroll = useCallback(() => {
    const dir = autoScrollDir.current;
    const el = scrollRef.current;
    const ds = dragState.current;
    if (dir !== 0 && el && ds) {
      const speed = 10; // px por frame, ritmo suave y predecible para 2-5 anios
      const prevScroll = el.scrollLeft;
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft = Math.max(0, Math.min(maxScroll, prevScroll + dir * speed));
      const aplicado = el.scrollLeft - prevScroll;
      if (aplicado !== 0) {
        // Se ajusta la BASE (startX), no el resultado final directamente. Asi, cuando
        // onDragMove vuelva a calcular la posicion con su propia formula, va a partir
        // de esta base ya corregida en vez de pisarla -- personaje y fondo quedan sincronizados.
        ds.startX += aplicado;
        const dx = ds.lastX - ds.startClientX;
        const dy = ds.lastY - ds.startClientY;
        setDragPos(prev => ({ ...prev, [ds.key]: { x: ds.startX + dx, y: ds.startY + dy } }));
      }
    }
    if (dragState.current && autoScrollDir.current !== 0) {
      autoScrollRAF.current = requestAnimationFrame(runAutoScroll);
    } else {
      autoScrollRAF.current = null;
    }
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;

    // Con el mapa abierto, el arrastre se usa solo para elegir una zona (gesto continuo).
    if (showMap) {
      chequearThumbnailMapa(e);
      return;
    }

    const now = performance.now();
    const dt = Math.max(now - ds.lastT, 1);
    ds.vx = (e.clientX - ds.lastX) / dt;
    ds.vy = (e.clientY - ds.lastY) / dt;
    ds.lastX = e.clientX; ds.lastY = e.clientY; ds.lastT = now;
    const dx = e.clientX - ds.startClientX;
    const dy = e.clientY - ds.startClientY;
    setDragPos(prev => ({ ...prev, [ds.key]: { x: ds.startX + dx, y: ds.startY + dy } }));

    // Sonido de "carrera" mientras se mueve el personaje arrastrado (sintetizado, tipo saltito 8-bit)
    const movimientoReal = Math.abs(ds.vx) + Math.abs(ds.vy) > 0.03;
    if (movimientoReal) {
      const lastRun = lastRunSoundT.current[ds.key] || 0;
      if (now - lastRun > 150) {
        lastRunSoundT.current[ds.key] = now;
        const alto = !runStepAlto.current[ds.key];
        runStepAlto.current[ds.key] = alto;
        note(alto ? 520 : 415, 0.09, 0.05, 'square');
      }
    }

    const zoneOfKey = parseInt(ds.key.split('-').pop() || '-1', 10);

    // Zona 1 "Puerta de Musgo": rastro de florcitas al pasar bajo el arco
    if (zoneOfKey === 0) {
      const lastT = lastTrailT.current[ds.key] || 0;
      if (now - lastT > 90) {
        lastTrailT.current[ds.key] = now;
        const id = ++trailId.current;
        setTrail(prev => [...prev.slice(-14), { id, x: e.clientX, y: e.clientY }]);
        setTimeout(() => setTrail(prev => prev.filter(t => t.id !== id)), 750);
      }
    }

    // Deteccion en caliente: las luces y puntos tematicos reaccionan al PASAR por encima
    // mientras se arrastra, sin necesidad de soltar el dedo (mas facil para 2-5 anios).
    if (zoneOfKey >= 0) {
      const lastHover = lastHoverCheckT.current[ds.key] || 0;
      if (now - lastHover > 90) {
        lastHoverCheckT.current[ds.key] = now;
        chequearHotspots(zoneOfKey, e);
        chequearPuntosTematicos(zoneOfKey, ds.key, e);
        if (!showMap) chequearTroncoMapa(e);
      }
    }

    // Auto-scroll de borde: si el dedo esta cerca del borde izquierdo o derecho
    // de la pantalla, el fondo se desplaza solo mientras dure el arrastre.
    const EDGE = 64;
    const vw = window.innerWidth;
    let dir: 0 | 1 | -1 = 0;
    if (e.clientX < EDGE) dir = -1;
    else if (e.clientX > vw - EDGE) dir = 1;
    autoScrollDir.current = dir;
    if (dir !== 0 && autoScrollRAF.current === null) {
      autoScrollRAF.current = requestAnimationFrame(runAutoScroll);
    }
  }, [chequearHotspots, chequearPuntosTematicos, chequearTroncoMapa, chequearThumbnailMapa, showMap, runAutoScroll]);

  const endDrag = useCallback((zi: number) => (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const key = ds.key;
    if (showMap) {
      // Solto sobre el fondo del mapa (no una miniatura): solo se cierra el gesto,
      // sin disparar hotspots/reacciones de la zona de origen.
      setSquash(prev => ({ ...prev, [key]: null }));
      dragState.current = null;
      autoScrollDir.current = 0;
      return;
    }
    note(523, 0.18, 0.15);
    setSquash(prev => ({ ...prev, [key]: 'drop' }));
    setTimeout(() => setSquash(prev => ({ ...prev, [key]: null })), 220);
    chequearHotspots(zi, e);
    chequearReaccion(zi, key, e);
    coast(key, ds.vx, ds.vy);
    dragState.current = null;
    autoScrollDir.current = 0;
  }, [coast, chequearReaccion, chequearHotspots, showMap]);

  const zonaCompleta = useCallback((zi: number) => {
    return ZONAS[zi].hotspots.every((_, hi) => collected.has(`${zi}-${hi}`));
  }, [collected]);

  const progreso = collected.size;
  const mundoCompleto = progreso === TOTAL_HOTSPOTS;
  const zonasCompletas = ZONAS.filter((_, zi) => zonaCompleta(zi)).length;

  const intentarPortal = useCallback(() => {
    if (mundoCompleto) {
      note(880, 0.4, 0.25); setTimeout(() => note(1046, 0.5, 0.25), 200);
      hablar('portalListo');
      setTimeout(() => router.push('/mundo/1'), 500);
    } else {
      setPortalNudge(true);
      note(220, 0.3, 0.2, 'triangle');
      hablar('portalNoListo');
      setTimeout(() => setPortalNudge(false), 700);
    }
  }, [mundoCompleto, router]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1030', overflow: 'hidden', touchAction: 'none', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}>
      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', zIndex: 60, background: 'rgba(20,10,40,.55)', backdropFilter: 'blur(10px)', isolation: 'isolate' }}>
        <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 50, padding: '7px 16px', fontSize: 13, color: 'white', cursor: 'pointer' }}>← Inicio</button>
        <button onClick={abrirMapaConSonido} style={{ background: 'rgba(255, 200, 90, .18)', border: '1px solid rgba(255,200,90,.5)', borderRadius: 50, padding: '7px 18px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          🗺️ Mapa de Tiqui ({zonasCompletas}/10)
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => { setShowLangPicker(true); note(659, 0.15, 0.15); }}
            aria-label="Elegir idioma"
            style={{
              width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)',
              background: 'rgba(255,255,255,.12)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{IDIOMAS_UI.find(o => o.id === idioma)?.flag || '🌐'}</button>
          <button
            onClick={() => setMuted(m => !m)}
            aria-label={muted ? 'Activar voz' : 'Silenciar voz'}
            style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: '50%', width: 34, height: 34, fontSize: 15, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >{muted ? '🔇' : '🔊'}</button>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', minWidth: 40, textAlign: 'right' }}>✨{progreso}/{TOTAL_HOTSPOTS}</div>
        </div>
      </div>

      {/* SCROLL HORIZONTAL DE ZONAS */}
      <div
        ref={scrollRef}
        className="mundo0-scroll"
        style={{
          position: 'absolute', inset: 0, overflowX: 'auto', overflowY: 'hidden',
          display: 'flex', flexDirection: 'row', WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        {ZONAS.map((zona, zi) => (
          <div key={zona.indice} data-zona-container style={{ position: 'relative', flex: `0 0 auto`, height: '100%', aspectRatio: `${ZONA_WIDTH} / ${ZONA_HEIGHT}`, animation: rumbleZona === zi ? 'rockRumble .35s ease-in-out' : 'none' }}>
            <Image
              src={`/assets/mundo0/${zona.archivo}`}
              alt={zona.nombre}
              fill
              priority={zi < 2}
              sizes="100vh"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />

            {/* Circulo del mapa — presente en TODAS las zonas (arriba a la izquierda), para poder
                abrir el mapa arrastrando al personaje sin importar en que zona este parado. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: '13%', top: '16%', transform: 'translate(-50%,-50%)',
                width: '11%', aspectRatio: '1/1', borderRadius: '50%', border: '5px solid rgba(255,215,120,.9)',
                background: 'radial-gradient(circle, rgba(255,215,120,.45), rgba(255,215,120,.08))',
                boxShadow: '0 0 30px rgba(255,215,120,.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4vh',
                pointerEvents: 'none', zIndex: 22, animation: 'mapPulse 2s ease-in-out infinite',
              }}
            >🗺️</div>

            {zona.hotspots.map((h, hi) => {
              const key = `${zi}-${hi}`;
              const done = collected.has(key);
              const leftPct = (h.x / ZONA_WIDTH) * 100;
              const topPct = (h.y / ZONA_HEIGHT) * 100;
              return (
                <div
                  key={hi}
                  aria-hidden="true"
                  style={{
                    position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                    transform: 'translate(-50%,-50%)', width: '5%', aspectRatio: '1/1',
                    pointerEvents: 'none', zIndex: 20,
                  }}
                >
                  <img
                    src="/assets/mundo0/hotspot_icon_v4.png"
                    alt=""
                    style={{
                      width: '100%', height: '100%', display: done ? 'none' : 'block',
                      animation: 'hotspotPulse 1.6s ease-in-out infinite',
                      filter: 'drop-shadow(0 0 8px rgba(180,150,255,.7))',
                    }}
                  />
                </div>
              );
            })}

            {/* Luciernaga de ayuda: presente en todas las zonas, toca para saber que falta */}
            <button
              onClick={() => pedirAyuda(zi)}
              aria-label="Pedir ayuda a la luciérnaga guía"
              style={{
                position: 'absolute', right: '5%', top: '10%', width: '9%', aspectRatio: '1/1',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', zIndex: 25,
              }}
            >
              <img
                src="/assets/mundo0/guia_luciernaga_v4.png"
                alt="Luciérnaga guía"
                draggable={false}
                style={{ width: '100%', animation: 'guideFloat 2.2s ease-in-out infinite', filter: 'drop-shadow(0 0 10px rgba(255,220,120,.6))' }}
              />
            </button>

            {/* Companero flotante: el personaje que el nino eligio. Existe en UNA sola zona a la vez
                (zonaCompanero) — no una copia en cada zona, para que tenga sentido "ir a buscarlo".
                En la Arboleda los anfitriones fijos rotan automaticamente si coinciden con el
                personaje elegido, asi que aca no hace falta ninguna exclusion especial. */}
            {zi === zonaCompanero && (
              <div style={{ position: 'absolute', left: '6%', bottom: '6%', width: '22%', zIndex: 19, transform: `translate(${dragPos[`${personajeActivo}-${zi}`]?.x || 0}px, ${dragPos[`${personajeActivo}-${zi}`]?.y || 0}px)` }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  filter: companionPulseZona === zi ? 'drop-shadow(0 0 18px rgba(255,220,150,.95))' : 'none',
                  animation: dragState.current?.key === `${personajeActivo}-${zi}`
                    ? 'none'
                    : companionPulseZona === zi
                      ? 'portalReady .5s ease-in-out 3'
                      : floating[`${personajeActivo}-${zi}`]
                        ? 'floatWater 2.6s ease-in-out infinite'
                        : 'charBounce 2.2s ease-in-out infinite .15s',
                }}>
                  <img
                    src={`/assets/mundo0/${PERSONAJE_POR_ID[personajeActivo]?.src || 'char_toqwow_v3.png'}`}
                    alt={PERSONAJE_POR_ID[personajeActivo]?.nombre || 'Toqwow'}
                    onPointerDown={startDrag(`${personajeActivo}-${zi}`)} onPointerMove={onDragMove} onPointerUp={endDrag(zi)} onPointerCancel={endDrag(zi)}
                    draggable={false}
                    style={{
                      width: '100%', display: 'block', cursor: 'grab', touchAction: 'none',
                      transform: squashTransform(`${personajeActivo}-${zi}`), transition: 'transform .12s ease-out',
                      filter: floating[`${personajeActivo}-${zi}`]
                        ? 'drop-shadow(0 10px 12px rgba(0,0,0,.45)) hue-rotate(-12deg) saturate(1.3)'
                        : 'drop-shadow(0 10px 12px rgba(0,0,0,.45))',
                    }} />
                  <div style={{
                    fontSize: '1.4vh', fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,.8)',
                    background: companionPulseZona === zi ? 'rgba(255,220,150,.9)' : 'rgba(20,10,40,.6)',
                    borderRadius: 8, padding: '1px 6px', marginTop: 2,
                    whiteSpace: 'nowrap', pointerEvents: 'none', transition: 'background .3s',
                  }}>{PERSONAJE_POR_ID[personajeActivo]?.nombre || 'Toqwow'}</div>
                </div>
              </div>
            )}

            {/* Amigos convocados desde la bandeja, presentes en la zona donde fueron llamados */}
            {AMIGOS_EXTRA.filter(a => amigosEnJuego[a.id] === zi && !(a.id === personajeActivo && zi === zonaCompanero)).map((amigo, ai) => {
              const key = `${amigo.id}-${zi}`;
              return (
                <div key={amigo.id} style={{
                  position: 'absolute', left: `${15 + ai * 22}%`, bottom: '8%', width: '20%', zIndex: 16,
                  transform: `translate(${dragPos[key]?.x || 0}px, ${dragPos[key]?.y || 0}px)`,
                }}>
                  <div style={{ animation: dragState.current?.key === key ? 'none' : 'charBounce 2.3s ease-in-out infinite' }}>
                    <img
                      src={`/assets/mundo0/${amigo.src}`} alt={amigo.nombre}
                      onPointerDown={startDrag(key)} onPointerMove={onDragMove} onPointerUp={endDrag(zi)} onPointerCancel={endDrag(zi)}
                      draggable={false}
                      style={{
                        width: '100%', display: 'block', cursor: 'grab', touchAction: 'none',
                        transform: squashTransform(key), transition: 'transform .12s ease-out',
                        filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.4))',
                      }} />
                  </div>
                </div>
              );
            })}

            {/* Portal en Zona 10: gated por progreso */}
            {zi === 9 && (
              <button
                onClick={intentarPortal}
                aria-label="Pasar al siguiente mundo"
                style={{
                  position: 'absolute', left: '68%', top: '58%', transform: 'translate(-50%,-50%)',
                  width: '12%', aspectRatio: '1/1', borderRadius: '50%', border: 'none', background: 'transparent',
                  cursor: 'pointer', zIndex: 21,
                  filter: mundoCompleto ? 'brightness(1.5) saturate(1.3)' : 'brightness(.55) saturate(.6) grayscale(.3)',
                  transition: 'filter .4s',
                  animation: portalNudge ? 'nudgeShake .4s ease-in-out' : mundoCompleto ? 'portalReady 1.8s ease-in-out infinite' : 'none',
                }}
              >
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,220,150,.5), rgba(150,100,255,.15))' }} />
              </button>
            )}

            {/* Destello de celebracion al completar esta zona */}
            {zonaCelebrando === zi && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none',
                background: 'radial-gradient(circle, rgba(255,220,150,.55), rgba(255,220,150,0) 70%)',
                animation: 'zonaCelebra 1.8s ease-out forwards',
              }} />
            )}

            {/* Factor WOW: evento visual mas grande, unico por zona */}
            {wowZona === zi && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 45, pointerEvents: 'none', overflow: 'hidden' }}>
                {zi === 4 ? (
                  <div style={{ position: 'absolute', inset: 0, animation: 'wowColorCycle 2.4s ease-in-out', mixBlendMode: 'screen' }} />
                ) : zi === 7 ? (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(180,140,255,.25)', animation: 'wowPulseRings 2.2s ease-out' }} />
                ) : zi === 9 ? (
                  <>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: `${45 + (i % 3) * 5}%`, bottom: 0, fontSize: 22,
                        animation: `wowRise 1.8s ease-out ${i * 0.12}s forwards`, opacity: 0,
                      }}>✨</div>
                    ))}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,.5), rgba(255,255,255,0) 60%)', animation: 'wowFlashWhite 2.4s ease-out' }} />
                  </>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, ${ZONA_WOW_COLOR[zi] || 'rgba(255,220,150,.5)'}, transparent 65%)`, animation: 'wowExpand 2.2s ease-out' }} />
                )}
              </div>
            )}

            {/* Bursts de recompensa */}
            {bursts.filter(b => b.zonaIdx === zi).map(b => (
              <div key={b.id} style={{
                position: 'fixed', left: b.x, top: b.y, transform: 'translate(-50%,-50%)',
                fontSize: b.tipo === 'splash' ? 44 : b.tipo === 'tema' ? 52 : 34, pointerEvents: 'none', zIndex: 70,
                animation: b.tipo === 'splash' ? 'splashRing .9s ease-out forwards' : b.tipo === 'tema' ? 'temaCelebra 1.3s ease-out forwards' : 'burstUp .9s ease-out forwards',
              }}>{b.emoji || (b.tipo === 'splash' ? '💦' : '✨')}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Rastro de florcitas de musgo (Zona 1, al pasar bajo el arco) */}
      {trail.map(t => (
        <div key={t.id} style={{
          position: 'fixed', left: t.x, top: t.y, transform: 'translate(-50%,-50%)',
          fontSize: 18, pointerEvents: 'none', zIndex: 65, animation: 'trailFade .75s ease-out forwards',
        }}>🌼</div>
      ))}

      {/* Cartel de instruccion tipo Toca Boca, aparece al entrar a cada zona o al pedir ayuda */}
      {(cartelZona !== null || cartelAyuda !== null) && (
        <div style={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
          maxWidth: '86%', background: 'rgba(255,255,255,.97)', borderRadius: 20,
          padding: '12px 18px', boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'center', gap: 12, animation: 'cartelIn .4s ease-out',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(160deg,#ffe9b0,#ffd27a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>{cartelAyuda !== null ? '🐝' : (ICONO_ZONA[cartelZona!] || '✨')}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3a2a1a', lineHeight: 1.35 }}>
            {cartelAyuda !== null ? cartelAyuda : (FRASES[`zona${cartelZona}`]?.[idioma] || FRASES[`zona${cartelZona}`]?.es)}
          </div>
        </div>
      )}

      {/* Bandeja de amigos convocables */}
      <div style={{
        position: 'absolute', bottom: 44, left: 0, right: 0, zIndex: 60,
        display: 'flex', gap: 10, overflowX: 'auto', padding: '6px 14px',
      }}>
        {AMIGOS_EXTRA.map(amigo => {
          const enJuego = amigosEnJuego[amigo.id] !== undefined;
          const activo = personajeActivo === amigo.id;
          return (
            <button
              key={amigo.id}
              onClick={() => convocarAmigo(amigo.id)}
              aria-label={`Convocar a ${amigo.nombre}`}
              style={{
                flexShrink: 0, width: 46, height: 46, borderRadius: '50%',
                border: activo ? '3px solid rgba(255,220,150,1)' : enJuego ? '2px solid rgba(255,220,150,.9)' : '2px solid rgba(255,255,255,.35)',
                boxShadow: activo ? '0 0 12px rgba(255,220,150,.85)' : 'none',
                background: 'rgba(20,10,40,.55)', backdropFilter: 'blur(6px)',
                padding: 4, cursor: 'pointer', opacity: enJuego || activo ? 1 : 0.75,
              }}
            >
              <img src={`/assets/mundo0/${amigo.src}`} alt={amigo.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          );
        })}
      </div>

      {/* Indicador de scroll sutil */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 60, fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'rgba(20,10,40,.4)', padding: '4px 12px', borderRadius: 20 }}>
        ⟵ Deslizá para explorar el planeta ⟶
      </div>

      {/* OVERLAY: Selector de idioma — 10 banderas */}
      {showLangPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(10,5,20,.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowLangPicker(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'rgba(30,15,50,.95)', border: '2px solid rgba(255,255,255,.2)', borderRadius: 24, padding: '22px 20px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, maxWidth: 320 }}
          >
            {IDIOMAS_UI.map(op => (
              <button
                key={op.id}
                onClick={() => { elegirIdioma(op.id); setShowLangPicker(false); }}
                aria-label={`Idioma ${op.id}`}
                style={{
                  width: 48, height: 48, borderRadius: '50%', fontSize: 22, cursor: 'pointer',
                  border: idioma === op.id ? '3px solid rgba(255,220,150,1)' : '2px solid rgba(255,255,255,.25)',
                  boxShadow: idioma === op.id ? '0 0 12px rgba(255,220,150,.8)' : 'none',
                  background: 'rgba(255,255,255,.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{op.flag}</button>
            ))}
          </div>
        </div>
      )}

      {/* OVERLAY: Presentacion inicial — Toqwow nombra a los 10 personajes, una sola vez. Sin texto: solo voz + sonido + animacion, igual que el resto del juego. */}
      {mostrarPresentacion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(10,5,20,.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5vh 5vw' }}>
          <div style={{
            width: 84, height: 84, marginBottom: 24, animation: presentacionIdx === 0 ? 'charBounce 1s ease-in-out infinite' : 'charBounce 2.2s ease-in-out infinite',
          }}>
            <img src="/assets/mundo0/char_toqwow_v3.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(255,220,150,.7))' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, maxWidth: 460 }}>
            {TODOS_PERSONAJES.map((p, i) => {
              const enFoco = presentacionIdx - 1 === i;
              const listoParaElegir = presentacionIdx > TODOS_PERSONAJES.length;
              const yaMostrado = presentacionIdx - 1 > i || listoParaElegir;
              return (
                <button
                  key={p.id}
                  onClick={() => cerrarPresentacion(p.id)}
                  aria-label={`Elegir a ${p.nombre}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    opacity: presentacionIdx === 0 ? 0.5 : (enFoco || yaMostrado ? 1 : 0.4),
                    transform: enFoco ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform .3s ease, opacity .3s ease',
                    animation: listoParaElegir ? 'charBounce 1.6s ease-in-out infinite' : 'none',
                    animationDelay: listoParaElegir ? `${i * 0.08}s` : '0s',
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', padding: 4,
                    border: enFoco || listoParaElegir ? '3px solid rgba(255,220,150,1)' : '2px solid rgba(255,255,255,.3)',
                    boxShadow: enFoco || listoParaElegir ? '0 0 16px rgba(255,220,150,.9)' : 'none',
                  }}>
                    <img src={`/assets/mundo0/${p.src}`} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
            {presentacionIdx > TODOS_PERSONAJES.length ? (
              <button
                onClick={() => cerrarPresentacion(personajeActivo)}
                aria-label="Empezar a jugar"
                style={{ background: 'rgba(255,220,150,.95)', border: 'none', borderRadius: 50, width: 64, height: 64, fontSize: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'portalReady 1.8s ease-in-out infinite' }}
              >▶️</button>
            ) : (
              <button
                onClick={() => cerrarPresentacion()}
                aria-label="Saltar presentacion"
                style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 50, width: 46, height: 46, fontSize: 18, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >⏭️</button>
            )}
          </div>
        </div>
      )}

      {/* OVERLAY: Mapa de Tiqui */}
      {showMap && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,5,20,.88)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5vh 4vw' }}>
          <div style={{
            background: 'linear-gradient(160deg, #e8d3a3, #d4b878)', borderRadius: 24, padding: '4vh 3vw',
            maxWidth: 720, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.5)', border: '4px solid #8a6a3a',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#4a3418', marginBottom: 6 }}>
              🗺️ Mapa de Planeta Tiqui
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#6a4f28', marginBottom: 18 }}>
              Arrastrá a tus amigos hasta cada luz escondida para completar el mapa
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {ZONAS.map((zona, zi) => {
                const completa = zonaCompleta(zi);
                const parcial = !completa && zona.hotspots.some((_, hi) => collected.has(`${zi}-${hi}`));
                return (
                  <button
                    key={zi}
                    data-zona-thumb={zi}
                    onClick={() => irAZona(zi)}
                    style={{
                      position: 'relative', border: '3px solid #8a6a3a', borderRadius: 14, padding: 0,
                      overflow: 'hidden', cursor: 'pointer', aspectRatio: '1/1',
                      filter: completa ? 'none' : parcial ? 'saturate(.7) brightness(.85)' : 'grayscale(.6) brightness(.6)',
                    }}
                  >
                    <img src={`/assets/mundo0/map/${zona.thumb}`} alt={zona.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {completa && (
                      <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 22, filter: 'drop-shadow(0 1px 3px black)' }}>⭐</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 12, fontWeight: 700, textAlign: 'center', color: 'white', background: 'rgba(0,0,0,.55)', padding: '3px 0' }}>{zi + 1}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button onClick={() => setShowMap(false)} style={{ background: '#8a6a3a', border: 'none', borderRadius: 50, padding: '8px 26px', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mundo0-scroll::-webkit-scrollbar { display: none; }
        .mundo0-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes hotspotPulse { 0%,100%{ transform: scale(1); opacity: 1; } 50%{ transform: scale(1.18); opacity: .75; } }
        @keyframes guideFloat { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-14px); } }
        @keyframes burstUp { 0%{ opacity: 1; transform: translate(-50%,-50%) scale(.5); } 100%{ opacity: 0; transform: translate(-50%,-160%) scale(1.6); } }
        @keyframes splashRing { 0%{ opacity: 1; transform: translate(-50%,-50%) scale(.3); } 60%{ opacity: 1; transform: translate(-50%,-50%) scale(1.4); } 100%{ opacity: 0; transform: translate(-50%,-50%) scale(1.9); } }
        @keyframes temaCelebra { 0%{ opacity: 0; transform: translate(-50%,-50%) scale(.2) rotate(-15deg); } 25%{ opacity: 1; transform: translate(-50%,-50%) scale(1.35) rotate(8deg); } 45%{ transform: translate(-50%,-50%) scale(1.05) rotate(-4deg); } 75%{ opacity: 1; transform: translate(-50%,-65%) scale(1.15) rotate(0deg); } 100%{ opacity: 0; transform: translate(-50%,-140%) scale(1.3); } }
        @keyframes zonaCelebra { 0%{ opacity: 0; } 25%{ opacity: 1; } 100%{ opacity: 0; } }
        @keyframes trailFade { 0%{ opacity: .9; transform: translate(-50%,-50%) scale(.6); } 40%{ opacity: .8; transform: translate(-50%,-50%) scale(1); } 100%{ opacity: 0; transform: translate(-50%,-50%) scale(.8) translateY(6px); } }
        @keyframes rockRumble { 0%,100%{ transform: translateX(0); } 20%{ transform: translateX(-4px) translateY(2px); } 40%{ transform: translateX(4px) translateY(-2px); } 60%{ transform: translateX(-3px); } 80%{ transform: translateX(3px); } }
        @keyframes cartelIn { 0%{ opacity: 0; transform: translateX(-50%) translateY(-14px) scale(.9); } 100%{ opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes wowExpand { 0%{ opacity: 0; transform: scale(.3); } 40%{ opacity: 1; transform: scale(1); } 100%{ opacity: 0; transform: scale(1.6); } }
        @keyframes wowColorCycle { 0%{ background: rgba(0,220,255,.35); } 33%{ background: rgba(180,120,255,.35); } 66%{ background: rgba(255,210,90,.35); } 100%{ background: rgba(0,220,255,0); } }
        @keyframes wowPulseRings { 0%{ opacity: 0; box-shadow: inset 0 0 0px rgba(180,140,255,.6); } 30%{ opacity: 1; } 100%{ opacity: 0; box-shadow: inset 0 0 140px rgba(180,140,255,0); } }
        @keyframes wowRise { 0%{ opacity: 0; transform: translateY(0) scale(.6); } 20%{ opacity: 1; } 100%{ opacity: 0; transform: translateY(-320px) scale(1.3); } }
        @keyframes wowFlashWhite { 0%{ opacity: 0; } 50%{ opacity: 1; } 100%{ opacity: 0; } }
        @keyframes charBounce { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-6%); } }
        @keyframes floatWater { 0%,100%{ transform: translateY(0) rotate(-3deg); } 50%{ transform: translateY(-4%) rotate(3deg); } }
        @keyframes mapPulse { 0%,100%{ transform: translate(-50%,-50%) scale(1); } 50%{ transform: translate(-50%,-50%) scale(1.1); } }
        @keyframes portalReady { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.08); } }
        @keyframes nudgeShake { 0%,100%{ transform: translate(-50%,-50%) rotate(0); } 25%{ transform: translate(-50%,-50%) rotate(-6deg); } 75%{ transform: translate(-50%,-50%) rotate(6deg); } }
        html, body { height: 100dvh; overscroll-behavior: none; }
        button, img { -webkit-tap-highlight-color: transparent; outline: none; -webkit-touch-callout: none; user-select: none; -webkit-user-drag: none; user-drag: none; -webkit-appearance: none; appearance: none; }
        button:focus, img:focus { outline: none; }
      `}</style>
    </div>
  );
}
