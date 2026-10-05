// Fotos aus Wikimedia Commons für Gemeinschaften aus dem Katalog (data/communities.js), Schlüssel = id.
// Lizenzen erlauben die Nutzung mit Namensnennung: Autor, Lizenz und Link zur Commons-Seite werden angezeigt.
// src = verkleinerte Fassung (960 px) direkt von Wikimedia, page = Commons-Dateiseite.
const C = 'https://upload.wikimedia.org/wikipedia/commons/'
export const COMMUNITY_IMAGES = {
  1: { src: C + 'thumb/3/37/004A_mwuerfel.jpg/960px-004A_mwuerfel.jpg', autor: 'Michael Würfel', lizenz: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:004A_mwuerfel.jpg' },
  2: { src: C + '1/1e/Zegg.jpg', autor: 'Felixx_Bln', lizenz: 'Gemeinfrei', page: 'https://commons.wikimedia.org/wiki/File:Zegg.jpg' },
  6: { src: C + 'thumb/d/de/2021_05_11_Brodowin_DJI_0946.jpg/960px-2021_05_11_Brodowin_DJI_0946.jpg', autor: 'Daniela Kloth', lizenz: 'GFDL 1.2', page: 'https://commons.wikimedia.org/wiki/File:2021_05_11_Brodowin_DJI_0946.jpg' },
  8: { src: C + 'thumb/2/21/Freetown_Christiania_-_main_entrance.jpg/960px-Freetown_Christiania_-_main_entrance.jpg', autor: 'Franklin Heijnen', lizenz: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:Freetown_Christiania_-_main_entrance.jpg' },
  9: { src: C + 'thumb/5/55/Svanholm_manor_main_building_feb_2005.JPG/960px-Svanholm_manor_main_building_feb_2005.JPG', autor: 'Wikimedia Commons', lizenz: 'Freie Nutzung', page: 'https://commons.wikimedia.org/wiki/File:Svanholm_manor_main_building_feb_2005.JPG' },
  12: { src: C + 'thumb/f/ff/Findhorn-Foundation-and-Community.jpg/960px-Findhorn-Foundation-and-Community.jpg', autor: 'Findhorn Foundation', lizenz: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Findhorn-Foundation-and-Community.jpg' },
  14: { src: C + 'thumb/4/47/The_Hub_building_at_Lammas.jpg/960px-The_Hub_building_at_Lammas.jpg', autor: 'Permaculture Association', lizenz: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:The_Hub_building_at_Lammas.jpg' },
  17: { src: C + 'thumb/c/cc/Centre_for_Alternative_Technology_%2828801170625%29.jpg/960px-Centre_for_Alternative_Technology_%2828801170625%29.jpg', autor: 'Tom P from Scottish Borders', lizenz: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:Centre_for_Alternative_Technology_(28801170625).jpg' },
  18: { src: C + 'thumb/4/4e/Samye_Ling_Temple.JPG/960px-Samye_Ling_Temple.JPG', autor: 'Robert Matthews', lizenz: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Samye_Ling_Temple.JPG' },
  19: { src: C + '5/5a/Tamera.jpg', autor: 'Sadavissr', lizenz: 'Gemeinfrei', page: 'https://commons.wikimedia.org/wiki/File:Tamera.jpg' },
  41: { src: C + 'thumb/d/d8/S%C3%B3lheimar_2024_%280780%29.jpg/960px-S%C3%B3lheimar_2024_%280780%29.jpg', autor: 'Steinninn', lizenz: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:S%C3%B3lheimar_2024_(0780).jpg' },
  72: { src: C + 'thumb/1/14/Lotan.jpg/960px-Lotan.jpg', autor: 'Hanan Cohen', lizenz: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:Lotan.jpg' },
  73: { src: C + '8/84/View_east_121202c_760.jpg', autor: 'Howard Shippin', lizenz: 'Gemeinfrei', page: 'https://commons.wikimedia.org/wiki/File:View_east_121202c_760.jpg' },
  85: { src: C + 'thumb/c/c1/Town_Hall_of_Auroville.jpg/960px-Town_Hall_of_Auroville.jpg', autor: 'Kaspar Konrad', lizenz: 'Gemeinfrei', page: 'https://commons.wikimedia.org/wiki/File:Town_Hall_of_Auroville.jpg' },
  107: { src: C + 'e/e1/Twinoaksaerial.jpg', autor: 'Rashaun', lizenz: 'CC0', page: 'https://commons.wikimedia.org/wiki/File:Twinoaksaerial.jpg' },
  109: { src: C + 'a/a7/Pokeberry_Hill_Duplex_at_Earthaven_Ecovillage.jpg', autor: 'Tattycorum', lizenz: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Pokeberry_Hill_Duplex_at_Earthaven_Ecovillage.jpg' },
  120: { src: C + 'thumb/3/31/Sointula%2C_British_Columbia_%2804%29.jpg/960px-Sointula%2C_British_Columbia_%2804%29.jpg', autor: 'Paul Hamilton', lizenz: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:Sointula,_British_Columbia_(04).jpg' },
  121: { src: C + 'thumb/e/e6/Aerial_view_of_Comunidad_Los_Horcones%2C_Sonora%2C_Mexico_%282021%29.jpg/960px-Aerial_view_of_Comunidad_Los_Horcones%2C_Sonora%2C_Mexico_%282021%29.jpg', autor: 'CommunityBehavior', lizenz: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Aerial_view_of_Comunidad_Los_Horcones,_Sonora,_Mexico_(2021).jpg' },
}
export function getCommunityImage(id) { return COMMUNITY_IMAGES[id] || null }
