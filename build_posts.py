import json, math
from datetime import datetime, timezone, timedelta
SYD = timezone(timedelta(hours=11))
# (id, author, utc, impressions, text, topic)
P = [
("2108298090755031284","elonmusk","2026-10-08T20:46:49Z",21817383,"And Grok @Bot only gets better from here 🚀 🚀 You could build an entire company made of Grok Bots!","Grok Bot"),
("2108396588544745887","elonmusk","2026-10-09T03:18:13Z",824107,"Using Grok @Bot is like hiring a super smart, hard-working person for peanuts","Grok Bot"),
("2108396888160387541","elonmusk","2026-10-09T03:19:24Z",731806,"We’re just going to have @Grok Bots manage Grokipedia","Grok Bot"),
("2108232824520319175","elonmusk","2026-10-08T16:27:29Z",8851360,"Hire Grok @Bot to manage your @Shopify store. He will do an amazing job!","Grok Bot"),
("2108187065687118261","elonmusk","2026-10-08T13:25:39Z",42832845,"Starlink is licensed in over 165 countries and has spent five years complying with every single law and requirement of the government of India, so why still no license? Is Ambani the real boss of India?","Starlink 印度"),
("2108206994356355342","RahulGandhi","2026-10-08T14:44:50Z",13775690,"Welcome to India, Elon. Wait till you discover the other guy.","Starlink 印度"),
("2108221292788981881","elonmusk","2026-10-08T15:41:39Z",10489429,"Thank you, Rahul. This is indeed troubling.","Starlink 印度"),
("2108180318842736942","elonmusk","2026-10-08T12:58:50Z",29931834,"People who oppose @Starlink hurt only the least-served. The wealthy or those living in large cities already have good Internet, so they don’t understand.","Starlink 印度"),
("2108177695271948445","elonmusk","2026-10-08T12:48:25Z",9102519,"🇮🇳 Starlink will help the least-served in India 🇮🇳","Starlink 印度"),
("2108321181602353333","elonmusk","2026-10-08T22:18:35Z",3518417,"Excited to announce that all super intelligence organizations have now jointly agreed to the ultimate in AI/SI safety: Moving all testing to Delta Airlines flights, where accessing the Internet is utterly impossible!","AI 安全"),
("2108434396604662253","elonmusk","2026-10-09T05:48:27Z",13288,"@levie I think this is the right move. Cruelty to something that believes it is experiencing pain is not ok.","AI 安全"),
("2108301601190412593","elonmusk","2026-10-08T21:00:46Z",51663,"@tomekkorbak @balesni @j_asminewang !!  (回复：前 OpenAI 安全研究员称被 OpenAI 开除)","AI 安全"),
("2108310399477293085","elonmusk","2026-10-08T21:35:44Z",1758972,"Congratulations to Sergey, Jensen, Lisa, Michael and Satya!","科学奖章"),
("2108225043419574573","elonmusk","2026-10-08T15:56:33Z",1554138,"Thank you on behalf of the amazing people of SpaceX, Tesla, Neuralink and Boring Company, without whom anything I have done would have been impossible","科学奖章"),
("2108261224639066470","elonmusk","2026-10-08T18:20:20Z",161176,"@RapidResponse47 @POTUS ❤️🇺🇸","科学奖章"),
("2108300805010784339","elonmusk","2026-10-08T20:57:36Z",447533,"RT @C_3C_3: 505 days after Elon’s decline and fall… He’s the World’s first trillionaire and National Medal of Science Award winner.","科学奖章"),
("2108296638263652416","elonmusk","2026-10-08T20:41:03Z",2207596,"Very big deal (quote: SpaceX acquires nationwide low-band spectrum for Starlink Mobile)","Starlink Mobile"),
("2108296168094544099","elonmusk","2026-10-08T20:39:11Z",3319597,"This is the last critical piece of the spectrum puzzle needed for SpaceX to provide complete phone coverage in America","Starlink Mobile"),
("2108309429128974617","elonmusk","2026-10-08T21:31:53Z",390084,"@chamath To the casual observer, this won’t seem like much. To those who understand the spectrum wars, it’s an earthquake.","Starlink Mobile"),
("2108315261044445330","elonmusk","2026-10-08T21:55:03Z",4094092,"This will sound super crazy, but I see a path to SpaceX being worth orders of magnitude more than the current Earth economy","Starlink Mobile"),
("2108194851770741118","elonmusk","2026-10-08T13:56:35Z",1222622,"@Complex Fire that judge!","美国政治"),
("2108185484425863265","elonmusk","2026-10-08T13:19:22Z",4378161,"Yes, they are traitors aiding an invasion and they deserve the fate of traitors","美国政治"),
("2108319173851947042","elonmusk","2026-10-08T22:10:36Z",5744860,"🤔 (quote: Polymarket — Talarico absent from campaign trail 12 days)","美国政治"),
("2108323124685230302","elonmusk","2026-10-08T22:26:18Z",456811,"RT @C_3C_3: Reid Hoffman is James Talarico's top donor.","美国政治"),
("2108261942624477524","elonmusk","2026-10-08T18:23:11Z",557060,"RT @WhiteHouse: America will establish a permanent presence on the moon. 🚀🌕","月球/特斯拉"),
("2108188172547223974","elonmusk","2026-10-08T13:30:03Z",115455,"@aaronburnett The path to a petawatt/year is mass drivers on the Moon","月球/特斯拉"),
("2108341931499536698","elonmusk","2026-10-08T23:41:02Z",484335,"RT @Gfilche: In the Cybercab I’m at peace 😌 ...","月球/特斯拉"),
("2107861120341942548","camolNFT","2026-10-07T15:50:27Z",764377,"If you own crypto, this is genuinely scary. A top bitcoin researcher (Justin Drake, EF) is telling us to move our crypto to a bunker — superhuman AI may break the cryptography before quantum computers do.","量子叙事"),
("2108146670529577335","BullTheoryio","2026-10-08T10:45:08Z",24440,"🚨 ETHEREUM RESEARCHER JUST WARNED THAT AI COULD HACK BITCOIN AND ETHEREUM WALLETS SOON (Oct 6 OpenAI 722 math papers; Drake: ECDSA could break within months worst case; ~6.9M BTC public keys exposed)","量子叙事"),
("2108433345990606948","bitecong","2026-10-09T05:44:17Z",396,"🤖 AI Signal (SOL) $QCAT — Quantum Cat is the fourteenth quantum-themed launch on Solana today; bundler wallets hold 27.1%.","量子叙事"),
("2108429013945332020","Picolas_Caged","2026-10-09T05:27:04Z",496,"New narrative: Quantum + AI resistant blockchains. Fuelled by Justin Drake's comments this week. ($STRK claims 2027)","量子叙事"),
]
def heat(n): return max(1, min(10, round(math.log10(max(n,10))*1.6 - 2.5)))
d = json.load(open("data.json"))
d["posts"] = [{
  "id": i, "time": datetime.fromisoformat(t.replace("Z","+00:00")).astimezone(SYD).strftime("%m/%d %H:%M"),
  "author": "@"+a, "text": x, "link": f"https://x.com/{a}/status/{i}", "topic": tp,
  "views": v, "heat": heat(v)} for i,a,t,v,x,tp in P]
json.dump(d, open("data.json","w"), ensure_ascii=False, indent=1)
for p in d["posts"]: print(p["time"], p["author"], p["views"], p["heat"])
