import { exec } from 'node:child_process'
import fs from 'node:fs'

const classSlug = 'documentacao-de-ap-is-node-js-com-open-api'

const bearerToken = process.env.BEARER_TOKEN

const journeyNodesUrl = `https://skylab-api.rocketseat.com.br/journey-nodes/${classSlug}`

const videoUrlFtr = (id) =>
  `https://vz-dc851587-83d.b-cdn.net/${id}/1080p/video.m3u8`

const refererFtr = 'https://iframe.mediadelivery.net/'

const videoUrlClasses = (id) =>
  `https://b-vz-762f4670-e04.tv.pandavideo.com.br/${id}/1920x1080/video.m3u8`

const refererClasses = 'https://player-vz-762f4670-e04.tv.pandavideo.com.br/'

// Function to download the video using FFmpeg
async function downloadVideo(url, output, referer = refererFtr) {
  console.log('Starting video download...')
  const command = `ffmpeg -headers "Referer: ${referer}" -i "${url}" -c copy -bsf:a aac_adtstoasc "./ftr/${classSlug}/${output}"`

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
    if (!fs.existsSync(`ftr/${classSlug}`)) {
      fs.mkdirSync(`ftr/${classSlug}`)
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

  const lessonsGroups = resJson.cluster?.groups || [resJson.group]

  for (let i = 0; i < lessonsGroups.length; i++) {
    const group = lessonsGroups[i]
    const groupName = `${i + 1} - ${group.title.replaceAll('/', '-')}`
    const groupLessons = group.lessons

    if (!fs.existsSync(`ftr/${classSlug}/${groupName}`)) {
      fs.mkdirSync(`ftr/${classSlug}/${groupName}`)
    }

    for (let index = 0; index < groupLessons.length; index++) {
      const lesson = groupLessons[index]
      if (lesson.type !== 'video') continue
      const title = `${index + 1} - ${lesson.last.title
        .replaceAll('&', 'e')
        .replaceAll(':', '')
        .replaceAll('/', ' ')
        .replaceAll('"', '')
        .replaceAll(',', '')}`

      fs.writeFile(
        `ftr/${classSlug}/${groupName}/${title}.txt`,
        lesson.last.description || '',
        () => {
          console.log(title)
        }
      )

      downloadVideo(
        videoUrlFtr(lesson.last.resource),
        `${groupName}/${title}.mp4`,
        refererFtr
      )
    }
  }
}

main()
