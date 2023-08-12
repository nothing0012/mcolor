import getColors from 'get-image-colors';
import fs from 'fs';
import axios from 'axios';
import sharp from 'sharp';
import nearestColor from 'nearest-color';
import chalk from 'chalk';

/////////////////////////////////////////////////
// Example config for OMB
const config = {
  inputFile: './omb.json',
  outputFile: './omb_output.json',
  targetColorSensitivity: 15, // for example 5-20
  targetColorCategories: {
    red: '#e8070a',
    green: '#668b65',
    blue: '#152fdd',
    white: '#ffffff',
    black: '#000000',
  },
};
/////////////////////////////////////////////////

type Inscription = {
  id: string;
  meta: {
    name: string;
    attributes?: {
      trait_type: string;
      value: string;
    }[];
  };
};

function getNearestColor(hex: string): string {
  const ntc = nearestColor.from(config.targetColorCategories);
  const color = ntc(hex);
  return color.name as string;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'arraybuffer',
  });

  if (response.status !== 200)
    throw new Error(`Failed to download image: ${response.data}`);
  return Buffer.from(response.data, 'binary');
}

async function main(): Promise<void> {
  const inscriptions: Inscription[] = JSON.parse(
    fs.readFileSync(config.inputFile).toString(),
  );

  for (const inscription of inscriptions) {
    const imgBuffer = await downloadImage(
      `https://ordinals.com/content/${inscription.id}`,
    );
    const pngBuffer = await sharp(imgBuffer).toFormat('png').toBuffer();
    const colors = await getColors(pngBuffer, {
      type: 'image/png',
      count: config.targetColorSensitivity,
    });
    const traits = new Set<string>();
    colors.forEach((color) => {
      const trait = getNearestColor(color.hex());
      if (!trait) return;
      traits.add(trait);
    });

    inscription.meta = inscription.meta || { name: '' };
    inscription.meta.attributes = inscription.meta.attributes || [];

    if (traits.has('red')) {
      inscription.meta.attributes.push({
        trait_type: 'color',
        value: 'red',
      });
      console.log(chalk.red(JSON.stringify(inscription)));
      continue;
    }

    if (traits.has('blue')) {
      inscription.meta.attributes.push({
        trait_type: 'color',
        value: 'blue',
      });
      console.log(chalk.blue(JSON.stringify(inscription)));
      continue;
    }

    if (traits.has('green')) {
      inscription.meta.attributes.push({
        trait_type: 'color',
        value: 'green',
      });
      console.log(chalk.green(JSON.stringify(inscription)));
      continue;
    }
  }

  fs.writeFileSync(config.outputFile, JSON.stringify(inscriptions, null, 2));
}

main();
