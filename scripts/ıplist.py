import re

# Ham veriyi buraya yapıştır (veri çok uzunsa dışardan dosya da okuyabilirsin)
raw_data = """
(ip,anonymityLevel,asn,country,isp,latency,org,port,protocols,speed,upTime,upTimeSuccessCount,upTimeTryCount,updated_at,responseTime
"190.109.72.41","elite","AS264231","BR","RG.COM - INFORMATICA & COMUNICACAO LTDA - ME","235","RG.COM - INFORMATICA & COMUNICACAO LTDA - ME","33633","socks4","1","100","3268","3275","2025-06-23T06:38:31.552Z","4879"
"188.136.162.30","elite","AS48309","IR","Ariana Gostar Spadana's","96","N/A","4153","socks4","1","94","9389","9991","2025-06-23T06:38:31.537Z","4673"
"54.36.183.52","elite","AS16276","FR","OVH SAS","14","OVH","9173","socks5","1","94","9309","9901","2025-06-23T06:38:31.645Z","4601"
"95.161.188.246","elite","AS8492","KZ","\"OBIT\" Ltd.","54","Obit, Ltd.","61537","socks4","1","100","647","647","2025-06-23T06:38:31.538Z","4594"
"162.214.75.79","elite","AS46606","US","Unified Layer","143","Unified Layer","52163","socks4","1","34","1117","3319","2025-06-23T06:38:31.550Z","199"
"182.253.172.111","elite","AS17451","ID","Biznet Metronet","173","N/A","8080","socks4","1","92","9309","10097","2025-06-23T06:38:31.550Z","1798"
"116.99.228.33","elite","AS24086","VN","Viettel Corporation","250","Viettel Group","50054","socks4","1","50","1119","2248","2025-06-23T06:38:31.551Z","5003"
"45.125.222.97","elite","AS63526","BD","Carnival Internet","204","N/A","47239","socks4","1","99","9820","9955","2025-06-23T06:38:31.548Z","3900"
"172.104.150.246","elite","AS63949","DE","Akamai Technologies","7","Linode","8080","socks4","2","100","1773","1779","2025-06-23T06:38:31.538Z","3183"
"119.42.125.209","elite","AS131090","TH","CAT-BB","197","N/A","32148","socks4","1","70","2037","2913","2025-06-23T06:38:31.549Z","4774"
"45.122.44.2","elite","AS38571","IN","Channel9 Cable Network","151","N/A","5678","socks4","1","100","3320","3323","2025-06-23T06:38:31.553Z","2327"
"61.7.183.32","elite","AS131090","TH","CAT Telecom Public Company Limited","225","National Telecom Public Company Limited","4145","socks4","1","91","2909","3182","2025-06-23T06:38:31.552Z","1380"
"188.75.186.152","elite","AS196735","CZ","JON.CZ s.r.o.","22","Katro Cust Dynamic","4145","socks4","1","99","3277","3301","2025-06-23T06:38:31.644Z","4802"
"74.70.175.180","elite","AS11351","US","Spectrum","110","Road Runner","80","socks4","1","100","2679","2681","2025-06-23T06:38:31.546Z","4298"
"192.241.205.63","elite","AS14061","US","DigitalOcean, LLC","149","Digital Ocean","60092","socks5","1","100","9917","9927","2025-06-23T06:38:31.644Z","686"
"203.143.38.249","elite","AS5087","LK","Lanka Communication Services (Pvt) Ltd.","205","Lanka Communication Services (Pvt) Ltd","8080","socks4","1","97","9747","10019","2025-06-23T06:38:31.535Z","5102"
"116.97.128.207","elite","AS7552","VN","Viettel Corporation","253","Viettel Group","10009","socks4","65","67","562","836","2025-06-23T06:38:31.545Z","4594"
"186.219.215.147","elite","AS262996","BR","Minas Telecomunicacoes E Informatica Ltda ME","202","Megaminas Telecomunicacoes Ltda","4153","socks4","1","51","1721","3354","2025-06-23T06:38:31.553Z","1623"
"147.139.133.15","elite","AS45102","ID","Alibaba Cloud LLC","168","Alibaba Cloud - ID","61524","socks5","1","97","9747","10009","2025-06-23T06:38:31.544Z","4517"
"80.155.35.142","elite","AS3320","DE","Deutsche Telekom AG","12","MVZ Labor Moebius","30001","socks5","1","100","10001","10023","2025-06-23T06:38:31.548Z","4993"
"172.67.0.21","elite","AS13335","CA","Cloudflare, Inc.","7","Cloudflare, Inc.","13335","socks4","1","100","10030","10031","2025-06-23T06:38:31.549Z","4195"
"202.50.202.65","elite","AS55696","ID","PT Starcom Solusindo","260","N/A","48617","socks4","1","99","9836","9976","2025-06-23T06:38:02.332Z","1399"
"94.16.105.36","elite","AS197540","DE","netcup GmbH","10","netcup GmbH","3128","socks4","1","100","456","456","2025-06-23T06:38:02.258Z","4379"
"36.37.180.59","elite","AS38623","KH","VIETTEL (CAMBODIA) PTE","202","Viettel (cambodia) Pte., Ltd.","1080","socks4","1","92","9204","9962","2025-06-23T06:38:02.346Z","1046"
"203.30.190.172","elite","AS209242","BZ","Cloudflare London, LLC","61","Umpire Associates LTD","80","socks4","1","100","10019","10021","2025-06-23T06:38:02.259Z","663"
"116.104.162.9","elite","AS7552","VN","Viettel Corporation","270","Viettel Group","1080","socks4","1","65","2025","3117","2025-06-23T06:38:02.255Z","5086"
"37.152.163.95","elite","AS198569","IR","Rahanet Zanjan Co. (Private Joint-Stock)","190","Rahanet Zanjan Co.","4153","socks4","1","92","9218","10005","2025-06-23T06:38:02.253Z","3822"
"109.172.114.16","elite","AS29182","RU","JSC IOT","42","JSC IOT","45785","socks5","1","65","6495","10010","2025-06-23T06:38:02.451Z","4899"
"187.103.74.137","elite","AS52965","BR","1telecom Servicos De Tecnologia EM Internet Ltda","199","1telecom Servicos De Tecnologia EM Internet Ltda","5678","socks4","1","96","9690","10046","2025-06-23T06:38:02.338Z","889"
"103.224.54.233","elite","AS134922","IN","R TECHNOLOGIES","154","Renu Softtech Sales and Services","31433","socks4","1","99","3189","3230","2025-06-23T06:38:02.253Z","2813"
"116.108.9.128","elite","AS7552","VN","Viettel Corporation","268","Viettel Group","20030","socks4","1","64","469","734","2025-06-23T06:38:02.256Z","2407"
"199.188.93.163","elite","AS64200","US","Vivid-hosting LLC","146","Vivid-hosting LLC","9000","socks5","1","100","9962","9979","2025-06-23T06:38:02.342Z","2908"
"103.81.114.182","elite","AS132148","MM","Horizon Telecom International","248","Horizon Telecom International Company Limited","4145","socks4","1","46","4635","10125","2025-06-23T06:38:02.335Z","5000"
"186.224.225.26","elite","AS53171","BR","America-NET Ltda.","998","America-NET Ltda","42648","socks4","1","100","10044","10064","2025-06-23T06:38:02.334Z","4122"
"176.123.56.58","elite","AS50396","RU","LLC Format-center","59","LLC Format-center","3629","socks4","1","99","10033","10093","2025-06-23T06:38:02.340Z","155"
"202.151.163.10","elite","AS24173","VN","NETNAM","252","N/A","1080","socks4","1","100","552","552","2025-06-23T06:38:02.341Z","4870"
"203.153.125.13","elite","AS38505","ID","GMNUSANTARA","168","N/A","65424","socks4","1","97","3179","3283","2025-06-23T06:38:02.335Z","4508"
"75.119.145.154","elite","AS51167","DE","BroadbandONE","6","FORTE INTERACTIVE, INC","12416","socks4","1","100","656","657","2025-06-23T06:38:02.449Z","4318"
"159.223.163.20","elite","AS14061","US","DigitalOcean, LLC","88","DigitalOcean, LLC","44171","socks5","1","39","3867","10040","2025-06-23T06:38:02.344Z","1488"
"180.250.159.49","elite","AS7713","ID","PT. Telekomunikasi Indonesia","199","N/A","4153","socks4","1","96","2891","3002","2025-06-23T06:38:02.342Z","1376"
"38.111.166.171","elite","AS174","US","Cogent Communications","82","Code 200, UAB","8888","socks4","1","93","441","474","2025-06-23T06:38:02.261Z","3897"
"66.207.184.57","elite","AS7029","US","Windstream Communications LLC","84","Voce Telecom, LLC","5432","socks4","1","98","9720","9949","2025-06-23T06:38:02.261Z","195"
"172.67.253.69","elite","AS13335","CA","Cloudflare, Inc.","4","Cloudflare, Inc.","80","socks4","1","100","10037","10038","2025-06-23T06:38:02.251Z","1810"
"139.28.27.180","elite","AS206150","PL","Internet Utilities Europe and Asia Limited","25","IPXO","80","socks4","1","99","1240","1248","2025-06-23T06:38:02.329Z","3787"
"185.163.195.167","elite","AS48506","MD","Metical SRL","42","Metical SRL","4153","socks4","1","100","3218","3221","2025-06-23T06:38:02.347Z","4386"
"172.67.167.7","elite","AS13335","CA","Cloudflare, Inc.","7","Cloudflare, Inc.","80","socks4","1","100","2980","2980","2025-06-23T06:38:02.346Z","4198"
"66.207.184.21","elite","AS7029","US","Windstream Communications LLC","97","Voce Telecom, LLC","5432","socks4","1","97","9656","9919","2025-06-23T06:38:02.340Z","2875"
"45.112.125.58","elite","AS58369","ID","FIBERNET","260","N/A","4145","socks4","1","99","9864","9981","2025-06-23T06:38:02.331Z","1895"
"70.166.167.38","elite","N/A","US","Cox Communications Inc.","155","N/A","57728","socks4","1","88","53","60","2025-06-23T06:38:02.259Z","485"
"213.135.234.101","elite","AS6661","LU","POST Luxembourg","9","EPT","4153","socks4","1","100","9923","9957","2025-06-23T06:38:02.329Z","4905"
"94.153.159.98","elite","AS15895","UA","Kyivstar UA","47","Kyivstar LLC","4153","socks4","1","99","3286","3315","2025-06-23T06:38:02.453Z","1495"
"160.251.96.109","elite","N/A","JP","GMO Internet Group, Inc.","241","N/A","2091","socks4","1","51","1002","1983","2025-06-23T06:38:02.264Z","899"
"77.90.13.41","elite","AS48314","DE","Michael Sebastian Schinzel trading as IP-Projects GmbH & Co. KG","7","Ip Network","50449","socks4","1","93","2991","3211","2025-06-23T06:38:02.249Z","3990"
"177.155.130.97","elite","AS53062","BR","Ggnet Telecom Backbone","224","ALT|GGNET TELECOM BACKBONE","5678","socks4","1","99","9850","9977","2025-06-23T06:38:02.263Z","1193"
"38.127.172.18","elite","AS174","US","Cogent Communications","86","Torlandia Trading SRL","11537","socks5","1","100","9937","9952","2025-06-23T06:38:02.451Z","3300"
"8.42.68.197","elite","AS399869","US","Mountain Broadband","124","Level 3, LLC","39593","socks4","1","96","3214","3333","2025-06-23T06:38:02.262Z","4792"
"50.116.29.136","elite","AS63949","US","Akamai Technologies, Inc.","118","Linode","32728","socks4","1","84","2334","2774","2025-06-23T06:37:40.763Z","3092"
"46.105.124.74","elite","AS16276","FR","OVH SAS","18","OVH ISP","7497","socks5","1","100","9951","9961","2025-06-23T06:37:40.758Z","1199"
"78.128.8.156","elite","AS57344","BG","Powernet Ltd","31","Telepoint Ltd","46485","socks4","1","99","2825","2845","2025-06-23T06:37:40.857Z","3969"
"188.247.61.234","transparent","N/A","RU","Unico network","61","N/A","8080","http","9786","100","438","438","2025-06-23T06:37:40.765Z","829"
"93.87.73.194","elite","AS8400","RS","Telekom Srbija","32","N/A","8080","socks4","1","100","10071","10075","2025-06-23T06:37:40.853Z","1787"
"162.214.201.57","elite","AS46606","US","Unified Layer","134","Unified Layer","19268","socks4","1","100","3126","3128","2025-06-23T06:37:40.856Z","1312"
"128.199.27.84","elite","AS14061","IN","DigitalOcean, LLC","144","DigitalOcean, LLC","45857","socks4","1","99","9895","10024","2025-06-23T06:37:40.854Z","715"
"34.117.70.177","elite","AS396982","US","Google LLC","4","Google Cloud","80","socks4","1","100","9963","9963","2025-06-23T06:37:40.763Z","3899"
"176.98.95.105","elite","AS41096","UA","TOV TV&Radio Company 'TIM'","84","TOV TV&Radio Company 'TIM'","30759","socks4","1","96","9644","10076","2025-06-23T06:37:40.859Z","4880"
"65.109.92.51","elite","AS24940","FI","Hetzner Online GmbH","40","Hetzner Online GmbH","19065","socks4","1","99","997","1007","2025-06-23T06:37:40.758Z","4703"
"104.131.94.90","elite","AS14061","US","DigitalOcean, LLC","95","Digital Ocean","51346","socks5","1","100","9876","9890","2025-06-23T06:37:40.853Z","3092"
"38.127.179.67","elite","AS174","US","Cogent Communications","87","Torlandia Trading SRL","11537","socks4","1","100","9886","9897","2025-06-23T06:37:40.857Z","4509"
"103.77.60.22","elite","AS134437","BD","Orange Communication (The Sky Traders Ltd)","221","LTD 367/Kazipara","53281","socks4","1","97","2627","2698","2025-06-23T06:37:40.765Z","4910"
"149.202.164.5","elite","AS16276","FR","OVH SAS","15","OVH","41580","socks4","1","100","10055","10057","2025-06-23T06:37:40.858Z","2021"
"104.16.72.45","elite","AS13335","CA","Cloudflare, Inc.","7","Cloudflare, Inc.","80","socks5","1","100","9984","9985","2025-06-23T06:37:40.754Z","4907"
"116.203.116.13","elite","AS24940","DE","Hetzner Online GmbH","17","Hetzner","25596","socks5","1","97","3006","3106","2025-06-23T06:37:40.852Z","4399"
"43.134.169.221","elite","AS132203","SG","Aceville Pte.ltd","248","N/A","443","socks4","1","88","8871","10090","2025-06-23T06:37:40.756Z","4179"
"201.147.86.225","elite","AS8151","MX","UNINET","148","Gestión de direccionamiento UniNet","3128","socks4","1","99","9869","9940","2025-06-23T06:36:50.049Z","4204"
"196.15.155.209","elite","AS5713","ZA","Telkom SA Ltd.","174","N/A","4145","socks4","1","100","3128","3134","2025-06-23T06:36:50.048Z","4999"
"85.2.149.139","elite","AS3303","CH","Swisscom (Schweiz) AG - Bluewin","16","Swisscom (Schweiz) AG","3128","socks5","1","100","3325","3326","2025-06-23T06:36:49.942Z","3375"
"162.254.38.202","elite","AS22612","US","Namecheap, Inc.","147","Namecheap, Inc.","40547","socks4","1","98","3298","3352","2025-06-23T06:36:49.940Z","3188"
"38.51.48.85","elite","AS272011","DO","Telemarch S.R.L","134","Telemarch S.R.L","5678","socks4","1","11","324","2859","2025-06-23T06:36:49.951Z","113"
"208.109.13.24","elite","AS26496","JP","GoDaddy.com, LLC","238","GoDaddy.com, LLC","7611","socks4","61","100","3326","3338","2025-06-23T06:36:49.948Z","2231"
"190.11.198.89","elite","AS27953","AR","Nodosud S.A","241","Nodosud S.A","4153","socks4","61","100","2740","2748","2025-06-23T06:36:49.941Z","4216"
"187.19.127.180","elite","AS53160","BR","Unidasnet Comunicacoes Ltda","195","Unidasnet Comunicacoes Ltda","4153","socks4","1","100","3290","3304","2025-06-23T06:36:49.853Z","4266"
"103.85.60.129","elite","AS131111","ID","MORATELINDONAP","167","N/A","3629","socks4","1","98","9622","9825","2025-06-23T06:36:49.934Z","2599"
"198.251.89.198","elite","AS53667","LU","FranTech Solutions","25","FranTech Solutions","51675","socks5","1","100","9978","10010","2025-06-23T06:36:49.863Z","4191"
"129.205.244.185","elite","N/A","BW","BOTSWANA FIBRE NETWORKS (Proprietary) Limited","188","N/A","5678","socks4","1","99","3321","3343","2025-06-23T06:36:49.940Z","3805"
"94.154.220.93","elite","AS48279","UA","Delta-Net LLC","35","Delta","5678","socks4","1","100","3318","3333","2025-06-23T06:36:49.929Z","4174"
"103.19.10.245","elite","AS55561","NZ","2talk Limited","295","2talk Limited","4153","socks4","1","99","9993","10053","2025-06-23T06:36:49.952Z","4428"
"124.133.20.234","elite","AS4837","CN","CHINA UNICOM China169 Backbone","222","JN srd","7302","socks5","1","82","8147","9919","2025-06-23T06:36:49.855Z","509"
"104.16.81.76","elite","AS13335","CA","Cloudflare, Inc.","4","Cloudflare, Inc.","80","socks5","1","100","9923","9924","2025-06-23T06:36:49.937Z","4990"
"213.171.44.82","elite","AS8732","RU","JSC Comcor","43","Comcor","3629","socks4","1","67","2194","3266","2025-06-23T06:36:49.949Z","4076"
"103.66.233.161","elite","AS134014","IN","NET 4 U SERVICES","161","N/A","4145","socks4","1","99","9984","10055","2025-06-23T06:36:49.860Z","4895"
"51.68.181.9","elite","AS16276","DE","OVH SAS","8","OVH GmbH","33701","socks4","1","100","2749","2750","2025-06-23T06:36:49.946Z","3712"
"103.83.36.1","elite","AS136171","US","Medha Hosting","183","Medhahosting in","5678","socks4","1","100","3190","3198","2025-06-23T06:36:49.854Z","4794"
"110.34.166.180","elite","AS35908","SG","Krypt Technologies","164","N/A","4153","socks4","1","99","9976","10028","2025-06-23T06:36:49.935Z","315"
"117.93.176.7","elite","AS4134","CN","Chinanet","244","Chinanet JS","8989","socks4","1","85","864","1011","2025-06-23T06:36:49.947Z","868"
"200.41.148.2","elite","AS10834","AR","Telefonica de Argentina","228","Telefonica de Argentina","12000","socks4","1","85","8367","9861","2025-06-23T06:36:49.859Z","4517"
"134.209.205.172","elite","AS14061","NL","DigitalOcean, LLC","10","DigitalOcean, LLC","8118","socks4","1","100","2478","2478","2025-06-23T06:36:49.862Z","2988"
"96.9.86.218","elite","AS131207","KH","SIGROUPS","193","N/A","5678","socks4","1","98","9782","9972","2025-06-23T06:36:49.939Z","4581"
"186.251.255.209","elite","AS267513","BR","Seanet Telecom Carazinho Eireli","210","Seanet Telecom Carazinho Eireli","26751","socks4","1","100","10061","10107","2025-06-23T06:36:49.935Z","3511"
"102.176.180.6","elite","AS328271","KE","Syokinet Solutions Limited","198","Syokinet Solutions","4153","socks4","1","99","9970","10097","2025-06-23T06:36:34.628Z","4600"
"202.165.38.185","elite","AS17538","ID","Circlecom","168","N/A","17538","socks4","1","99","9918","10010","2025-06-23T06:36:34.546Z","1105")
"""  # Verinin tamamını buraya yapıştır

# IP adreslerini tespit et
ip_list = re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', raw_data)

# Dosyaya yaz
with open("ip_list.txt", "w") as f:
    f.write("\n".join(ip_list))

print("Tüm IP'ler 'ip_list.txt' dosyasına yazıldı.")
