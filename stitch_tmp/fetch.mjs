import { stitch } from '@google/stitch-sdk';

const projectId = '11405630944839622141';
const screens = [
  'asset-stub-assets-12ee6b94689a44e5b90feb21e5166c76-1779198936579',
  '2b3345fe392e430eb7d302dee5789844',
  'b997b9c2dbc642d4bdbda659c3e9c88f',
  '6d9ed02713274f99830a542c9acf07a5',
  '7c4734cdec7143d8a36967b8e683ce92'
];

async function main() {
  const project = stitch.project(projectId);
  for (const screenId of screens) {
    try {
      const screen = await project.getScreen(screenId);
      const htmlUrl = await screen.getHtml();
      const imgUrl = await screen.getImage();
      console.log(`Screen: ${screenId}`);
      console.log(`HTML: ${htmlUrl}`);
      console.log(`Image: ${imgUrl}`);
      console.log('---');
    } catch (e) {
      console.error(`Error fetching ${screenId}:`, e.message);
    }
  }
}

main().catch(console.error);
