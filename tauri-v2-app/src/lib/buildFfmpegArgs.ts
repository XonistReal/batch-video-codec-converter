export type HwAccel = 'auto' | 'nvenc' | 'amf' | 'qsv' | 'none';

export interface ConversionSettings {
  codec: string;
  hwAccel: HwAccel;
  trimStart: string;
  trimEnd: string;
  extractAudio: boolean;
  lutPath: string;
}

function hwEncoderArgs(hwAccel: HwAccel): string[] | null {
  switch (hwAccel) {
    case 'nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'];
    case 'amf':
      return ['-c:v', 'h264_amf', '-quality', 'balanced', '-rc', 'cqp', '-qp_i', '23', '-qp_p', '23'];
    case 'qsv':
      return ['-c:v', 'h264_qsv', '-preset', 'medium', '-global_quality', '23'];
    case 'auto':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'];
    default:
      return null;
  }
}

export function buildFfmpegArgs(settings: ConversionSettings): string[] {
  const args: string[] = [];

  if (settings.trimStart) {
    args.push('-ss', settings.trimStart);
  }
  if (settings.trimEnd) {
    args.push('-to', settings.trimEnd);
  }

  const hw = settings.hwAccel !== 'none' ? hwEncoderArgs(settings.hwAccel) : null;
  const useHw =
    hw !== null &&
    (settings.codec === 'h264_standard' ||
      settings.codec === 'h264_hq' ||
      settings.codec === 'h264_4k_downscale');

  switch (settings.codec) {
    case 'h264_4k_downscale':
      if (useHw) {
        args.push(...hw!, '-vf', 'scale=3840:2160:force_original_aspect_ratio=decrease');
      } else {
        args.push(
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-vf',
          'scale=3840:2160:force_original_aspect_ratio=decrease',
        );
      }
      args.push('-c:a', 'aac', '-b:a', '192k');
      break;
    case 'h264_standard':
      if (useHw) {
        args.push(...hw!);
      } else {
        args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p');
      }
      args.push('-c:a', 'aac', '-b:a', '192k');
      break;
    case 'h264_hq':
      if (useHw) {
        args.push(...hw!);
      } else {
        args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p');
      }
      args.push('-c:a', 'aac', '-b:a', '256k');
      break;
    case 'dnxhr_hqx':
      args.push('-c:v', 'dnxhd', '-profile:v', 'dnxhr_hqx', '-pix_fmt', 'yuv422p10le');
      break;
    case 'dnxhr_sq':
      args.push('-c:v', 'dnxhd', '-profile:v', 'dnxhr_sq', '-pix_fmt', 'yuv422p');
      break;
    case 'dnxhr_lb':
      args.push('-c:v', 'dnxhd', '-profile:v', 'dnxhr_lb', '-pix_fmt', 'yuv422p');
      break;
    case 'prores_hq':
      args.push('-c:v', 'prores_ks', '-profile:v', '3');
      break;
    case 'prores_proxy':
      args.push('-c:v', 'prores_ks', '-profile:v', '0');
      break;
    case 'hevc':
      args.push('-c:v', 'libx265', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p');
      args.push('-c:a', 'aac', '-b:a', '192k');
      break;
    default:
      args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p');
      args.push('-c:a', 'aac', '-b:a', '192k');
  }

  if (settings.lutPath) {
    args.push('-vf', `lut3d=${settings.lutPath.replace(/\\/g, '/')}`);
  }

  if (settings.extractAudio) {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', '320k');
  }

  return args;
}

export function getOutputExtension(codec: string, extractAudio: boolean): string {
  if (extractAudio) return 'mp3';
  if (codec.startsWith('dnxhr') || codec.startsWith('prores')) return 'mov';
  return 'mp4';
}
