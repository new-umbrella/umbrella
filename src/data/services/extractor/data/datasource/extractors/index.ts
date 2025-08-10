import {ExtractorInfo} from '../../../domain/entities/ExtractorInfo';
import JWPlayerInfo from './video/JWPlayer';
import VidHideExtractorInfo from './video/VidHideExtractor';
import AsianLoadInfo from './video/AsianLoad';
import BilibiliExtractorInfo from './video/Bilibili';
import FilemoonInfo from './video/Filemoon';
import GogoCDNInfo from './video/GogoCdn';
import KwikInfo from './video/Kwik';
import MegaUpInfo from './video/MegaUp';
import MixDropInfo from './video/MixDrop';
import Mp4PlayerInfo from './video/Mp4Player';
import Mp4UploadInfo from './video/Mp4Upload';
import RapidCloudInfo from './video/RapidCloud';
import SmashyStreamInfo from './video/SmashyStream';
import StreamHubInfo from './video/StreamHub';
import StreamLareInfo from './video/StreamLare';
import StreamSBInfo from './video/StreamSb';
import StreamTapeInfo from './video/StreamTape';
import StreamWishInfo from './video/StreamWish';
import VidCloudInfo from './video/VidCloud';
import VidMolyInfo from './video/VidMoly';
import VizCloudInfo from './video/VizCloud';
import VoeInfo from './video/Voe';
import UniversalExtractorInfo from './video/UniversalExtractor';

// Newly added extractors (converted from Python to Typescript from https://github.com/yogesh-hacker/MediaVanced)
import VcdnlareInfo from './video/Vcdnlare';
import MegacloudInfo from './video/Megacloud';
import MultiQualityInfo from './video/MultiQuality';
import NoodleMagazineInfo from './video/NoodleMagazine';
import PhotojinInfo from './video/Photojin';
import PixFusionInfo from './video/PixFusion';
import PornhatInfo from './video/Pornhat';
import PornhubInfo from './video/Pornhub';
import RubystreamInfo from './video/Rubystream';
import SaicordInfo from './video/Saicord';
import SendInfo from './video/Send';
import SpeedoStreamInfo from './video/SpeedoStream';
import StreamBucketInfo from './video/StreamBucket';
import StreamingCommunityzInfo from './video/StreamingCommunityz';
import StreamOUploadInfo from './video/StreamOUpload';
import StreamP2PInfo from './video/StreamP2P';
import UperboxInfo from './video/Uperbox';
import VidSrcInfo from './video/VidSrc';
import UpVidInfo from './video/UpVid';

const Extractors = {
  ExtractorVideo: [
    new VidHideExtractorInfo(),
    new JWPlayerInfo(),
    new AsianLoadInfo(),
    new FilemoonInfo(),
    new GogoCDNInfo(),
    new BilibiliExtractorInfo(),
    new KwikInfo(),
    new MegaUpInfo(),
    new MixDropInfo(),
    new Mp4PlayerInfo(),
    new Mp4UploadInfo(),
    new RapidCloudInfo(),
    new SmashyStreamInfo(),
    new StreamHubInfo(),
    new StreamLareInfo(),
    new StreamSBInfo(),
    new StreamTapeInfo(),
    new StreamWishInfo(),
    new VidCloudInfo(),
    new VidMolyInfo(),
    new VizCloudInfo(),
    new VoeInfo(),
    new UniversalExtractorInfo(),

    // Converted from ref/MediaVanced-main/sites
    new VcdnlareInfo(),
    new MegacloudInfo(),
    new MultiQualityInfo(),
    new NoodleMagazineInfo(),
    new PhotojinInfo(),
    new PixFusionInfo(),
    new PornhatInfo(),
    new PornhubInfo(),
    new RubystreamInfo(),
    new SaicordInfo(),
    new SendInfo(),
    new SpeedoStreamInfo(),
    new StreamBucketInfo(),
    new StreamingCommunityzInfo(),
    new StreamOUploadInfo(),
    new StreamP2PInfo(),
    new UperboxInfo(),
    new VidSrcInfo(),
    new UpVidInfo(),
  ] as ExtractorInfo[],
  Other: [],
};

export default Extractors;
