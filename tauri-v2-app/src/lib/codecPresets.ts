export type CodecSizeTag = 'small' | 'large' | 'massive';

export interface CodecOption {
  value: string;
  label: string;
  desc: string;
  size: CodecSizeTag;
}

export const CODEC_OPTIONS: CodecOption[] = [
  {
    value: 'h264_4k_downscale',
    label: 'H.264 8-bit 4K Downscale',
    desc: 'Fix 5K Resolve Free Error',
    size: 'small',
  },
  {
    value: 'h264_standard',
    label: 'H.264 8-bit Standard',
    desc: 'Resolve Free Compatible',
    size: 'small',
  },
  {
    value: 'h264_hq',
    label: 'H.264 High Quality',
    desc: 'Standard MP4',
    size: 'small',
  },
  {
    value: 'dnxhr_hqx',
    label: 'DNxHR HQX 10-bit',
    desc: 'Editing Codec, 4:2:2',
    size: 'massive',
  },
  {
    value: 'dnxhr_sq',
    label: 'DNxHR SQ 8-bit',
    desc: 'Editing Codec, 4:2:2',
    size: 'massive',
  },
  {
    value: 'dnxhr_lb',
    label: 'DNxHR LB Proxy',
    desc: 'Proxy Editing',
    size: 'large',
  },
  {
    value: 'prores_hq',
    label: 'ProRes 422 HQ',
    desc: 'Professional Editing',
    size: 'massive',
  },
  {
    value: 'prores_proxy',
    label: 'ProRes 422 Proxy',
    desc: 'Proxy Editing',
    size: 'large',
  },
  {
    value: 'hevc',
    label: 'H.265 / HEVC',
    desc: 'Smallest File Size',
    size: 'small',
  },
];

export const DEFAULT_CODEC = 'h264_standard';
