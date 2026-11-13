const performancePicks = {
  'human-feed': {
    source: 'Aquarium Drunkard',
    url: 'https://aquariumdrunkard.com/2026/11/05/the-lagniappe-sessions-leah-senior/',
    en: {
      title: 'What changes when you slow a song down?',
      note: 'For a home recording, Leah Senior slows down the guitar riff in John Renbourn’s “Rainy Day.” Listen for what that choice does to the feel of the song. It’s a small example of how a performer can make a familiar piece their own.'
    },
    zh: {
      title: '把一首歌放慢，会听见什么？',
      note: '莉娅·西尼尔在家录制约翰·伦伯恩的《Rainy Day》时，放慢了那段反复出现的吉他旋律。听听这个变化怎样改变了整首歌的感觉，也让熟悉的曲子有了她自己的味道。'
    }
  },
  'ai-feed': {
    source: 'The Markup',
    url: 'https://themarkup.org/show-your-work/2026/01/21/how-we-tested-ai-generated-dance-videos',
    post: 'https://bsky.app/profile/themarkup.org/post/3n23ytstxfb2l',
    quote: 'None of the videos produced by the leading AI platforms showed the actual dances we requested.',
    en: {
      title: 'A convincing dancer can still be doing the wrong dance',
      note: 'The Markup and CalMatters asked four video generators to recreate nine dance styles. The clips could look lifelike, yet none showed the dance requested. Like Leah Senior’s guitar recording, this test draws attention to the details of a performance. Here, the steps were how the reporters checked whether the tools understood the request.'
    },
    zh: {
      title: '舞跳得像模像样，舞步却对不上',
      note: 'The Markup 和 CalMatters 用四款视频生成工具测试了九种舞蹈。生成的画面可以很逼真，但没有一段跳出了指定的舞蹈。和莉娅·西尼尔的吉他录音一样，这个实验也让人留意表演的细节。在这里，舞步是记者判断工具是否理解指令的依据。',
      quote: '主流 AI 平台生成的视频，没有一段呈现我们指定的舞蹈。'
    }
  }
};

export const editions = [
  {
    en: {
      question: 'When did making something become a matter of proving you made it?',
      note: 'A sketch or an early draft can help someone understand how work came together. These discussions raise a different question: how much of the process should a person have to share when someone doubts them?',
      prompt: 'Has AI changed what you save or share about how you make things? Tell us what you changed and why.'
    },
    zh: {
      question: '从什么时候起，做出一件作品还得证明是自己做的？',
      note: '草图或初稿可以让人看懂一件作品是怎样做出来的。这两场讨论还提出了另一个问题：当别人怀疑你的作品出自 AI，你有必要公开多少创作过程？',
      prompt: 'AI 有没有改变你保存或分享创作过程的方式？欢迎告诉我们你做了什么改变，以及原因。'
    },
    picks: {
      'human-feed': {
        source: 'r/ProCreate · Reddit', url: 'https://www.reddit.com/r/ProCreate/comments/1xcq9nh/having_to_show_your_entire_art_process_to_prove/',
        en: { title: 'When a drawing comes with a request for proof', note: 'Artists discuss being asked to show how they made their work. One commenter describes being accused of using AI after bringing a pencil drawing into Procreate to continue working on it.' },
        zh: { title: '发一张画，还要交出创作过程？', note: '有画友谈到，作品发出来以后，被要求展示绘画过程。一位留言者说，自己把铅笔画导入 Procreate 继续加工，却被怀疑用了 AI。' }
      },
      'ai-feed': {
        source: 'r/writingadvice · Reddit', url: 'https://www.reddit.com/r/writingadvice/comments/1x5wtfr/how_much_proof_is_enough_proof_regarding_ai/',
        en: { title: 'When backups become a record of authorship', note: 'A writer revising a manuscript had been emailing copies to themselves in case their computer crashed. After seeing discussions about AI accusations, they turned on Track Changes and wondered whether their earlier drafts would be enough to show how they wrote the book.' },
        zh: { title: '备份草稿，也成了写作记录', note: '一位正在改稿的作者原本把不同版本发到自己的邮箱，防止电脑故障。看到有人讨论被怀疑用 AI 写作后，作者打开了修订功能，也开始想：以前保存的草稿能不能说明这本书是怎样写出来的？' }
      }
    }
  },
  {
    en: { question: 'What makes an imitation feel like a performance?', note: 'A cover can change the timing on purpose. A dance test asks whether the timing and steps survived at all. Put the two side by side and listen for which details carry the identity of the work.' },
    zh: { question: '模仿怎样才会成为一次表演？', note: '翻唱可以有意改变节奏，而舞蹈实验要看指定的舞步和节奏有没有保留下来。把两者放在一起，留意哪些细节让你认出原作。' },
    picks: performancePicks
  },
  {
    en: { question: 'What does the finished work hide?', note: 'A painting can hold the traces of sand and layers of color. For a work used in AI training, those traces alone tell us little about where it came from. The two pieces ask what we can learn by looking beyond the finished image.' },
    zh: { question: '成品背后，有哪些看不见的过程？', note: '画面上能看到沙粒和层层叠加的色彩。但一件作品进入 AI 训练数据后，单凭这些痕迹很难知道它来自哪里。两篇文章都让人想往成品背后再看一步。' },
    picks: {
      'human-feed': {
        source: 'Colossal', url: 'https://www.thisiscolossal.com/2026/11/sky-glabush-landscape-paintings/',
        en: { title: 'A landscape built from sand and oil', note: 'Grace Ebert looks at how Sky Glabush uses sand, oil paint, and repeated color studies to give his landscapes their texture.' },
        zh: { title: '用沙粒和油彩画出的风景', note: '格蕾丝·埃伯特写到，斯凯·格拉布什用沙粒和油彩作画，反复尝试不同的配色，让风景有了独特的质感。' }
      },
      'ai-feed': {
        source: 'Creative Commons', url: 'https://creativecommons.org/using-cc-licensed-works-for-ai-training-2/',
        en: { title: 'Following creative work into AI training', note: 'Creative Commons examines how its licenses apply when creative work is used in AI training. It gives readers a starting point for asking how the work and its creator can be credited.' },
        zh: { title: '作品进入 AI 训练之后', note: '知识共享组织讨论了创作被用于 AI 训练时，知识共享许可如何适用。读完可以接着追问：作品和创作者的署名如何保留？' }
      }
    }
  },
  {
    en: { question: 'What makes an exchange feel personal?', note: 'A typewritten interview makes the format part of the conversation. A hiring story shows why a polished first message can still leave someone unsure who is on the other end.' },
    zh: { question: '怎样的交流能让人感到对面有个具体的人？', note: '一场用打字机进行的采访，让交流的形式也成了谈话的一部分。另一篇招聘手记写到，哪怕第一条消息措辞得体，也可能让人弄不清对方是谁。' },
    picks: {
      'human-feed': {
        source: 'Austin Kleon', url: 'https://austinkleon.com/2026/11/12/typewriter-interview-with-grant-snider/',
        en: { title: 'An interview with Grant Snider, typed out', note: 'Austin Kleon shares a typewriter interview with cartoonist and writer Grant Snider. Look at how the format shapes the experience of reading their exchange.' },
        zh: { title: '用打字机采访格兰特·斯奈德', note: '奥斯汀·克莱昂分享了他用打字机与漫画家、作家格兰特·斯奈德做的一次采访。读的时候，可以留意这种形式怎样改变了阅读对话的感受。' }
      },
      'ai-feed': {
        source: 'The Markup', url: 'https://themarkup.org/hello-world/2026/01/24/we-posted-a-job-then-came-the-ai-slop-impersonator-and-recruiter-scam',
        en: { title: 'What happened after one job ad went up', note: 'A first-person account from The Markup follows a hiring process complicated by AI-written applications and an impersonation scam that targeted applicants.' },
        zh: { title: '一则招聘启事发出之后', note: 'The Markup 的这篇招聘手记记下了两件事：有人用 AI 撰写申请，也有人冒充招聘方，向求职者行骗。' }
      }
    }
  }
];
