import { exec } from 'node:child_process'
import fs from 'node:fs'

const className = 'aplicacao-de-upload-de-imagens'

const bearerToken = process.env.BEARER_TOKEN

const journeyNodesUrl = `https://skylab-api.rocketseat.com.br/journey-nodes/${className}`

const videoUrl = (id) =>
  `https://vz-dc851587-83d.b-cdn.net/${id}/1080p/video.m3u8`

// Function to download the video using FFmpeg
async function downloadVideo(url, output) {
  console.log('Starting video download...')
  const command = `ffmpeg -headers "Referer: https://iframe.mediadelivery.net/" -i "${url}" -c copy -bsf:a aac_adtstoasc "./aulas/${className}/${output}"`

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error downloading video:', error.message)
        reject(error)
      } else {
        console.log('Download complete:', output)
        resolve()
      }
    })
  })
}

async function main() {
  try {
    if (!fs.existsSync(className)) {
      fs.mkdirSync(`aulas/${className}`)
    }
  } catch (err) {
    console.error(err)
  }

  const res = await fetch(journeyNodesUrl, {
    headers: {
      Authorization: bearerToken,
    },
  })
  const resJson = await res.json()
  const lessons = resJson.group.lessons

  for (let index = 0; index < lessons.length; index++) {
    const lesson = lessons[index]
    const title = `${index + 1} - ${lesson.last.title
      .replaceAll('&', 'e')
      .replaceAll(':', '')}`

    fs.writeFile(
      `aulas/${className}/${title}.txt`,
      lesson.last.description,
      () => {
        console.log(title)
      }
    )

    // await downloadVideo(videoUrl(lesson.last.resource), `${title}.mp4`)
  }
}

main()
