export const comparisonDemoClips = [
  {id:'sample-net-attempt-1',title:'Net attempt 1',fileName:'matched-attempt-1.mp4',author:'LayG Traveller',
    sourceUrl:'https://www.pexels.com/video/intense-cricket-batting-practice-session-40800361/',
    markers:{backlift:.83,downswing:.96,followThrough:1.38}},
  {id:'sample-net-attempt-2',title:'Net attempt 2',fileName:'matched-attempt-2.mp4',author:'LayG Traveller',
    sourceUrl:'https://www.pexels.com/video/intense-cricket-batting-practice-session-40800361/',
    markers:{backlift:.58,downswing:.71,followThrough:1.17}},
];

const earlierDemoClips = [
  {id:'sample-batting-field',title:'Field practice',fileName:'batting-field.mp4',author:'Sandeep Singh',
    sourceUrl:'https://www.pexels.com/video/man-playing-cricket-on-a-sports-field-15172075/',
    markers:{backlift:1.40,downswing:1.60,followThrough:1.90}},
  {id:'sample-batting-net',title:'Net practice',fileName:'batting-net.mp4',author:'Shulabh Singh Chauhan',
    sourceUrl:'https://www.pexels.com/video/cricketer-practicing-in-net-cage-with-bat-35804207/',
    markers:{backlift:1.80,downswing:2.00,followThrough:2.17}},
];

export const bundledDemoClips = [...comparisonDemoClips,...earlierDemoClips];
export const demoClipById = id => bundledDemoClips.find(clip=>clip.id===id);
export const demoClipPath = clip => `./demo/${clip.fileName}`;
