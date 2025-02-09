import React from 'react';
import { useAppContext } from '../../pokenae.WebComponent/src/context/AppContext';

const SubPage = () => {
  const { showInfo, showSuccess, showWarning, showError } = useAppContext();

  return (
    <div>
      <h1>Sub Page</h1>
      <div>
        <button onClick={() => showInfo('This is an info message on subpage', 3000)}>Show Info</button>
        <button onClick={() => showSuccess('This is a success message on subpage', 3000)}>Show Success</button>
        <button onClick={() => showWarning('This is a warning message on subpage', 3000)}>Show Warning</button>
        <button onClick={() => showError('This is an error message on subpage', 3000)}>Show Error</button>
      </div>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Quibusdam officiis sit molestias corrupti asperiores, ducimus quasi recusandae doloribus quae adipisci enim error deleniti voluptates modi, ullam ipsum debitis sunt cum!</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Suscipit, eius libero, dicta quas autem ullam recusandae amet ex aspernatur delectus nam ipsa numquam a sunt at qui nobis eos dignissimos.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam, consequuntur vel, aut autem suscipit, maiores alias doloribus omnis magnam eligendi non quae. Nostrum omnis praesentium, commodi saepe reiciendis atque itaque!</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Magnam quos molestiae quas quidem quam voluptas dolores, voluptatem officia quaerat, dicta fugiat explicabo repellendus sint delectus, accusamus perferendis. Neque, cumque reiciendis.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Magnam, velit, sunt fuga quo mollitia itaque quae ea repudiandae modi quisquam eius excepturi laboriosam ut dolore libero id commodi error. Reiciendis!</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Repellendus debitis expedita necessitatibus saepe ex? Temporibus exercitationem, quidem excepturi blanditiis deserunt reiciendis consequatur! Dolorem obcaecati, accusantium voluptatem inventore corporis nesciunt ratione?</p>
      <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ullam possimus atque eum doloribus suscipit voluptatem consequatur rem? Distinctio ducimus ullam illum sint architecto harum deserunt aperiam, unde, commodi porro maxime.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Iure eius perferendis rerum est ipsum veniam, et similique, maiores laborum omnis odio voluptas aperiam aliquam error! Unde deserunt impedit aspernatur magnam.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Laboriosam facere explicabo in tempore accusamus deleniti praesentium autem ut enim quia animi sint cupiditate, eius est doloribus voluptatibus. Doloremque, vero magnam.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquam autem debitis cupiditate nemo accusamus necessitatibus minus quaerat iure aut repellendus iusto, ipsa animi dignissimos odio doloribus eius provident asperiores quos?</p>
      <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Optio quasi natus expedita eius error molestias facere fugit, nesciunt dignissimos provident eos qui repellat quis adipisci debitis eveniet at consequuntur dicta.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas repellendus eveniet ab consequatur neque eos reiciendis dicta. Molestiae molestias delectus dolorem nemo animi facilis dignissimos temporibus omnis quas, excepturi amet.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Exercitationem nostrum similique nemo, facilis repudiandae labore perspiciatis culpa obcaecati laboriosam? Rem optio accusantium, vitae sequi nemo aspernatur error sunt dolore blanditiis?</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Quaerat quae maiores, dignissimos iusto labore adipisci quis. Dignissimos maiores nulla, placeat iusto amet iure laboriosam minus quibusdam odit cum provident perspiciatis.</p>
      <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Debitis molestias nesciunt voluptas obcaecati? Nisi, ad vitae non illo laudantium ipsum repudiandae quis soluta commodi quas amet ea iste quod quos.</p>
      <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Praesentium numquam maiores aliquid ex sequi ipsam ratione exercitationem nam. Ducimus fugiat, fugit ad vero suscipit ipsam necessitatibus libero autem quia molestiae.</p>
      <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Asperiores expedita dolorem ullam dolor vel, quis optio? Ut ad velit alias voluptas, asperiores nihil accusantium, laboriosam repellat maiores molestias cupiditate necessitatibus?</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Id placeat dicta minima quae est optio rem eligendi accusantium, reiciendis adipisci dolorum asperiores itaque autem? Ex dolorem suscipit illo laudantium inventore?</p>
      <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Dicta ipsam exercitationem, doloremque aut esse cupiditate ipsum eveniet facere praesentium sequi voluptatum labore, nesciunt excepturi tenetur! Architecto eveniet repellendus consequatur ex!</p>
      <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Consectetur velit fuga laudantium dolores, perferendis odit dolor hic magni eius reprehenderit. Quae facilis et tempora provident quibusdam praesentium sed dolores earum!</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus sunt nihil officiis nisi eveniet cupiditate praesentium fugiat, obcaecati in, assumenda perspiciatis repudiandae iure sapiente? Animi ipsam earum maiores necessitatibus laudantium.</p>
      <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ad tempore explicabo neque ipsum quidem illum rerum, laboriosam dignissimos, dicta labore eius dolores ex minus dolorum earum doloribus atque. Sunt, temporibus?</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum beatae laudantium, doloribus delectus excepturi dignissimos animi dolores quibusdam, itaque voluptate corrupti distinctio ullam assumenda mollitia repellat porro, id molestiae accusamus?</p>
      <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Nulla a architecto illo praesentium dolorem dolores consectetur, culpa magni, possimus accusamus ullam autem laudantium velit adipisci consequatur eum beatae est ipsum.</p>
    </div>
  );
};

export default SubPage;
