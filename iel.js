import * as cheerio from 'cheerio'
import { exec } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const cookie =
  '_afid=367065fa-92ee-4ba1-b050-cd28dd8dce0f; aid=367065fa-92ee-4ba1-b050-cd28dd8dce0f; ajs_group_id=null; ajs_anonymous_id=%22811f15b9-d71d-4085-8f1a-efb12a728035%22; _ga=GA1.1.1285581086.1742398296; _fbp=fb.1.1742398295921.204943127874312215; __ssid=8e339a81b99beb92277df9f40d73916; ahoy_visitor=bb87aeb0-becc-4f2d-b4b8-473642acd5eb; _session_id=3bc3103a12256410d80d7b6cfb399900; aid=367065fa-92ee-4ba1-b050-cd28dd8dce0f; ajs_user_id=%22104974980%22; __stripe_mid=3e258c75-8c4d-4fd3-b28e-15fa7e4611ff6e3349; _hp2_ses_props.318805607=%7B%22ts%22%3A1742560324902%2C%22d%22%3A%22uxunicornio.vip%22%2C%22h%22%3A%22%2F%22%7D; __stripe_mid=8ce3120a-6d2d-4200-89e2-403e0c28326290b48e; __stripe_sid=5a7c9ccd-1b22-4ac6-ac2e-15d2d2aa21c5120e23; ahoy_visit=eedac8ba-9656-4594-b60b-06d4c714b707; ahoy_track=true; sk_xc63yj57_access=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ1c2VyIiwiaWF0IjoxNzQyNTYwNDE3LCJqdGkiOiI2OWMzYmMyNC0wODBhLTRkYWEtYjM2Mi0yMjMwYmRlNzI2NzgiLCJpc3MiOiJza194YzYzeWo1NyIsInN1YiI6IjI5MzBlZDllLWMyNTktNGViMi1iZTMzLTI1OTMzMWY5YmY4MSJ9.T5v1x614_Y8bVXtm37AcanfIRfjTH2qzp5PXD7oF30M; sk_xc63yj57_remember_me=1; signed_in=true; site_preview=logged_in; __stripe_sid=5a7c9ccd-1b22-4ac6-ac2e-15d2d2aa21c5120e23; _hp2_props.318805607=%7B%22template_name%22%3A%22%22%7D; _hp2_id.318805607=%7B%22userId%22%3A%221161631046605051%22%2C%22pageviewId%22%3A%221682764092975201%22%2C%22sessionId%22%3A%225142291991680297%22%2C%22identity%22%3A%22104974980%22%2C%22trackerVersion%22%3A%224.0%22%2C%22identityField%22%3Anull%2C%22isIdentified%22%3A1%7D; _ga_SL8LSCXHSV=GS1.1.1742560325.6.1.1742560430.0.0.0'
const courseId = '1460248'

const courseUrl = `https://www.uxunicornio.vip/courses/enrolled/${courseId}`
const lectureUrl = (lectureId) =>
  `https://www.uxunicornio.vip/courses/${courseId}/lectures/${lectureId}`
const privateVideoUrl = (attachmentId) =>
  `https://www.uxunicornio.vip/api/v2/hotmart/private_video?attachment_id=${attachmentId}`
const embedUrl = (videoId, signature) =>
  `https://player.hotmart.com/embed/${videoId}?signature=${signature}&token=aa2d356b-e2f0-45e8-9725-e0efc7b5d29c&user=104974980`

async function downloadAllVideos() {
  const response = await fetch(courseUrl, { headers: { cookie } })
  const html = await response.text()
  const $ = cheerio.load(html)
  const lectureElements = $('[data-lecture-id]')
  const h2Elements = $('h2')
  const courseName = h2Elements.text().split('\n')[0].replaceAll(':', ' -')
  if (!existsSync(courseName)) {
    mkdirSync(courseName)
  }

  for (const element of lectureElements) {
    const lectureIndex = lectureElements.index(element) + 1
    // if (!dowloadIndexClasses.includes(lectureIndex)) {
    //   continue
    // }
    const lectureId = element.attribs['data-lecture-id']
    const lectureName = $(element)
      .find('.lecture-name')
      .text()
      .replaceAll('  ', '')
      .replaceAll('\n', '')
      .replaceAll('@', '')
      .replaceAll(',', ' ')
      .replaceAll('"', '')
      .replaceAll('/', '-')
      .replaceAll(/(\([0-9]{1,3}\:[0-9]{1,2}\))/g, '')
      .replaceAll(':', '')
    const res = await fetch(lectureUrl(lectureId), { headers: { cookie } })
    const lectureHtml = await res.text()
    const $lecture = cheerio.load(lectureHtml)
    const attachemntId = $lecture('[data-attachment-id]').attr(
      'data-attachment-id'
    )
    const privateVideoRes = await fetch(privateVideoUrl(attachemntId), {
      headers: { cookie },
    })
    const privateVideoData = await privateVideoRes.json()
    const videoId = privateVideoData.video_id
    const signature = privateVideoData.signature
    const embedRes = await fetch(embedUrl(videoId, signature))
    const embedResText = await embedRes.text()
    const $embedhtml = cheerio.load(embedResText)
    const scriptElement = $embedhtml('#__NEXT_DATA__')
    const videoUrl = JSON.parse(scriptElement.contents()[0].data).props
      .pageProps.applicationData?.mediaAssets[0].url
    if (videoUrl) {
      downloadVideo(
        videoUrl,
        `./${courseName}/${lectureIndex} - ${lectureName}.mp4`
      )
    }
  }
}

async function downloadVideo(url, output) {
  console.log(
    new Date().toLocaleString('pt-BR'),
    '- Starting video download...',
    output
  )
  const command = `ffmpeg -loglevel fatal -headers "Referer: https://player.hotmart.com/\r\nOrigin: https://player.hotmart.com" -i "${url}" -c copy -bsf:a aac_adtstoasc "${output}"`

  return new Promise((resolve, reject) => {
    exec(
      command,
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            new Date().toLocaleString('pt-BR'),
            '- Error downloading video:',
            error.message
          )
          reject(error)
        } else {
          console.log(
            new Date().toLocaleString('pt-BR'),
            '- Download complete:',
            output
          )
          resolve()
        }
      },
      {}
    )
  })
}

downloadAllVideos()
