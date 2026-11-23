export const comparisonDemoClips = [
  {id:'sample-batting-field',title:'Field practice',fileName:'batting-field.mp4',author:'Sandeep Singh',
    sourceUrl:'https://www.pexels.com/video/man-playing-cricket-on-a-sports-field-15172075/',
    markers:{backlift:1.40,downswing:1.60,followThrough:1.90}},
  {id:'sample-batting-net',title:'Net practice',fileName:'batting-net.mp4',author:'Shulabh Singh Chauhan',
    sourceUrl:'https://www.pexels.com/video/cricketer-practicing-in-net-cage-with-bat-35804207/',
    markers:{backlift:1.80,downswing:2.00,followThrough:2.17}},
];

export const demoClipById = id => comparisonDemoClips.find(clip=>clip.id===id);
export const demoClipPath = clip => `./demo/${clip.fileName}`;
